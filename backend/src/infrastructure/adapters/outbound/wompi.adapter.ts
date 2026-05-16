// CAPA: Infraestructura — Adaptador de salida (Outbound Adapter)
// Implementa IPasarelaPagoPort usando la API REST de Wompi (sandbox).
// Tarjeta: GET merchant acceptance_token → POST card token → POST transaction (síncrono).
// PSE: POST transaction → devuelve URL del banco (asíncrono).
// NEQUI: POST transaction → push notification al usuario (asíncrono, sin redirect URL).

import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import type { IPasarelaPagoPort, RespuestaTransaccion, EstadoTransaccionWompi } from '../../../domain/puertos/pasarela-pago.port';

const WOMPI_BASE       = 'https://sandbox.wompi.co/v1';
const PUBLIC_KEY       = process.env.WOMPI_PUBLIC_KEY       ?? '';
const PRIVATE_KEY      = process.env.WOMPI_PRIVATE_KEY      ?? '';
const INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET ?? '';

@Injectable()
export class WompiAdapter implements IPasarelaPagoPort {

  async procesarPago(metodoPago: string, detalles: any, monto: number): Promise<RespuestaTransaccion> {
    try {
      const centavos   = Math.round(monto * 100);
      const referencia = `TXN-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

      if (metodoPago === 'PSE')   return this.procesarPse(detalles, centavos, referencia);
      if (metodoPago === 'NEQUI') return this.procesarNequi(detalles, centavos, referencia);

      return this.procesarTarjeta(detalles, centavos, referencia);
    } catch (err: any) {
      return { aprobado: false, motivoRechazo: err?.message ?? 'Error desconocido en la pasarela Wompi' };
    }
  }

  // Consulta el estado real de una transacción en Wompi para flujos PSE / NEQUI
  async consultarTransaccion(wompiTxId: string): Promise<EstadoTransaccionWompi> {
    const res  = await fetch(`${WOMPI_BASE}/transactions/${wompiTxId}`, {
      headers: { 'Authorization': `Bearer ${PRIVATE_KEY}` },
    });
    const data   = await res.json();
    const status = (data.data?.status as string) ?? 'ERROR';
    return {
      aprobado:      status === 'APPROVED',
      estado:        status,
      motivoRechazo: status !== 'APPROVED' ? (data.data?.status_message ?? undefined) : undefined,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  // SHA256(referencia + monto_en_centavos + moneda + secreto_integridad)
  private firmaIntegridad(referencia: string, centavos: number): string {
    const input = `${referencia}${centavos}COP${INTEGRITY_SECRET}`;
    return createHash('sha256').update(input).digest('hex');
  }

  private async obtenerAcceptanceToken(): Promise<string> {
    const res  = await fetch(`${WOMPI_BASE}/merchants/${PUBLIC_KEY}`);
    const data = await res.json();
    const token = data?.data?.presigned_acceptance?.acceptance_token ?? '';
    if (!token) console.error('[Wompi] No se pudo obtener acceptance_token. Respuesta:', JSON.stringify(data));
    return token;
  }

  // ─── Tarjeta (crédito / débito) ─────────────────────────────────────────────
  private async procesarTarjeta(detalles: any, centavos: number, referencia: string): Promise<RespuestaTransaccion> {
    const acceptanceToken = await this.obtenerAcceptanceToken();
    if (!acceptanceToken) {
      return { aprobado: false, motivoRechazo: 'No se pudo obtener el token de aceptación de Wompi.' };
    }

    // El frontend envía la fecha como "MM/AA" en datosTarjeta.fecha
    const venc  = detalles?.vencimiento ?? detalles?.fecha ?? '12/27';
    const [rawMes = '12', rawAnio = '27'] = venc.split('/');
    const expMes  = rawMes.trim().padStart(2, '0');
    const expAnio = rawAnio.trim().length === 4 ? rawAnio.trim().slice(-2) : rawAnio.trim();
    const numero  = (detalles?.numero ?? '').toString().replace(/\D/g, '');

    const tokenRes  = await fetch(`${WOMPI_BASE}/tokens/cards`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${PUBLIC_KEY}`,
      },
      body: JSON.stringify({
        number:      numero,
        cvc:         detalles?.cvv ?? '123',
        exp_month:   expMes,
        exp_year:    expAnio,
        card_holder: detalles?.titular ?? 'TEST USER',
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.status !== 'CREATED') {
      const msg = tokenData.error?.messages?.[0] ?? 'Error al tokenizar la tarjeta.';
      return { aprobado: false, motivoRechazo: msg };
    }

    const cardToken = tokenData.data?.id as string;
    const cuotas    = parseInt(detalles?.cuotas ?? '1', 10);

    const txRes  = await fetch(`${WOMPI_BASE}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${PRIVATE_KEY}`,
      },
      body: JSON.stringify({
        amount_in_cents: centavos,
        currency:        'COP',
        customer_email:  detalles?.email ?? 'cliente@ecommerce.co',
        payment_method: {
          type:         'CARD',
          token:        cardToken,
          installments: cuotas,
        },
        reference:        referencia,
        acceptance_token: acceptanceToken,
        signature:        this.firmaIntegridad(referencia, centavos),
      }),
    });
    const txData = await txRes.json();
    const status = txData.data?.status as string | undefined;
    const txId   = (txData.data?.id ?? referencia).toString();

    if (status === 'APPROVED') return { aprobado: true, idTransaccionBanco: txId };
    if (status === 'PENDING')  return { aprobado: true, esAsincrono: true, idTransaccionBanco: txId };

    const motivo = txData.data?.status_message ?? txData.error?.messages?.[0] ?? 'Pago rechazado por Wompi.';
    return { aprobado: false, motivoRechazo: motivo };
  }

  // ─── PSE ────────────────────────────────────────────────────────────────────
  private async procesarPse(detalles: any, centavos: number, referencia: string): Promise<RespuestaTransaccion> {
    const acceptanceToken = await this.obtenerAcceptanceToken();
    const esJuridica      = detalles?.tipoPersona === 'juridica';

    const txRes  = await fetch(`${WOMPI_BASE}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${PRIVATE_KEY}`,
      },
      body: JSON.stringify({
        amount_in_cents: centavos,
        currency:        'COP',
        customer_email:  detalles?.email ?? 'cliente@ecommerce.co',
        payment_method: {
          type:                       'PSE',
          user_type:                  esJuridica ? 1 : 0,
          user_legal_id_type:         esJuridica ? 'NIT' : 'CC',
          user_legal_id:              detalles?.documentoPse ?? '1234567890',
          financial_institution_code: detalles?.bancoPse ?? '1007',
          payment_description:        'Pago E-Commerce',
        },
        reference:        referencia,
        acceptance_token: acceptanceToken,
        signature:        this.firmaIntegridad(referencia, centavos),
      }),
    });
    const txData = await txRes.json();
    const status = txData.data?.status as string | undefined;
    const txId   = (txData.data?.id ?? referencia).toString();

    // Wompi retorna la URL del banco en payment_method.extra.async_payment_url
    const link = txData.data?.payment_method?.extra?.async_payment_url
              ?? txData.data?.payment_method_info?.async_payment_url
              ?? txData.data?.redirect_url;

    if (status === 'PENDING' || status === 'APPROVED') {
      return { aprobado: true, esAsincrono: true, linkPago: link, idTransaccionBanco: txId };
    }

    console.log('[Wompi][PSE] Response inesperado:', JSON.stringify(txData));
    return { aprobado: false, motivoRechazo: this.extraerMotivoError(txData, 'PSE') };
  }

  // ─── NEQUI ──────────────────────────────────────────────────────────────────
  // Wompi envía un push notification a la app de Nequi — no hay URL de redirección.
  // Número de prueba en sandbox: 3991111111 (aprueba automáticamente).
  private async procesarNequi(detalles: any, centavos: number, referencia: string): Promise<RespuestaTransaccion> {
    const acceptanceToken = await this.obtenerAcceptanceToken();
    console.log('[Wompi][NEQUI] acceptance_token:', acceptanceToken ? 'OK' : 'VACÍO — revisar WOMPI_PUBLIC_KEY');

    const telefono = (detalles?.telefonoNequi ?? '3991111111').toString().replace(/\D/g, '');
    const body = {
      amount_in_cents: centavos,
      currency:        'COP',
      customer_email:  detalles?.email ?? 'cliente@ecommerce.co',
      payment_method: {
        type:         'NEQUI',
        phone_number: telefono,
      },
      reference:        referencia,
      acceptance_token: acceptanceToken,
      redirect_url:     'http://localhost:3000/pago',
      signature:        this.firmaIntegridad(referencia, centavos),
    };
    console.log('[Wompi][NEQUI] Request body:', JSON.stringify(body));

    const txRes  = await fetch(`${WOMPI_BASE}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${PRIVATE_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const txData = await txRes.json();
    console.log('[Wompi][NEQUI] Response:', JSON.stringify(txData));

    const status = txData.data?.status as string | undefined;
    const txId   = (txData.data?.id ?? referencia).toString();

    if (status === 'PENDING' || status === 'APPROVED') {
      return { aprobado: true, esAsincrono: true, idTransaccionBanco: txId };
    }

    const motivo = this.extraerMotivoError(txData, 'NEQUI');
    return { aprobado: false, motivoRechazo: motivo };
  }

  // Extrae el mensaje de error más descriptivo de la respuesta de Wompi
  private extraerMotivoError(txData: any, metodo: string): string {
    if (txData.data?.status_message) return txData.data.status_message;
    if (txData.error?.messages) {
      const msgs = Object.entries(txData.error.messages as Record<string, string[]>)
        .map(([campo, errores]) => `${campo}: ${errores.join(', ')}`)
        .join(' | ');
      if (msgs) return msgs;
    }
    if (txData.error?.type) return `Error Wompi: ${txData.error.type}`;
    return `Error al iniciar pago ${metodo}.`;
  }
}
