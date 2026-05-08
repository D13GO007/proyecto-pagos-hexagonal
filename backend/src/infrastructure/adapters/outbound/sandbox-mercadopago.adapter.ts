// CAPA: Infraestructura — Adaptador de salida (Outbound Adapter)
// Implementa IPasarelaPagoPort usando la API de Mercado Pago (sandbox)
// y simuladores locales para los métodos asincrónicos (PSE, Nequi, Efectivo).

import { Injectable } from '@nestjs/common';
import { IPasarelaPagoPort, RespuestaTransaccion } from '../../../domain/puertos/pasarela-pago.port';
import axios from 'axios';

// ⚠️ DEUDA TÉCNICA: mover a variables de entorno (.env)
const ACCESS_TOKEN = 'TEST-2640329825605865-041014-e54f95cd6eea392bcb981b772406aa52-1277124040';
const PUBLIC_KEY   = 'TEST-f206202c-d479-407f-b529-5384ab66a37b';

@Injectable()
export class SandboxMercadoPagoAdapter implements IPasarelaPagoPort {

  async procesarPago(metodoPago: string, detalles: any, monto: number): Promise<RespuestaTransaccion> {
    try {
      // Métodos asincrónicos: redirigen al portal/simulador del banco o red de cobro
      if (metodoPago === 'PSE') {
        const ref = `PSE-${Date.now()}`;
        const banco = detalles?.bancoPse || '1007';
        return {
          aprobado: true,
          esAsincrono: true,
          linkPago: `http://localhost:3000/pse-simulador?ref=${ref}&monto=${monto}&banco=${banco}`,
          idTransaccionBanco: ref,
        };
      }

      if (metodoPago === 'NEQUI') {
        const ref = `NEQUI-${Date.now()}`;
        const telefono = detalles?.telefonoNequi || '3000000000';
        return {
          aprobado: true,
          esAsincrono: true,
          linkPago: `http://localhost:3000/nequi-simulador?ref=${ref}&monto=${monto}&telefono=${telefono}`,
          idTransaccionBanco: ref,
        };
      }

      if (metodoPago === 'EFECTIVO') {
        const ref = `EFE-${Date.now()}`;
        return {
          aprobado: true,
          esAsincrono: true,
          linkPago: `http://localhost:3000/efectivo-simulador?ref=${ref}&monto=${monto}&punto=${detalles?.punto || 'efecty'}`,
          idTransaccionBanco: ref,
        };
      }

      // Método síncrono: tarjeta de crédito/débito vía Mercado Pago
      const fechaRaw = detalles?.fechaExp || detalles?.fecha || '';
      if (!fechaRaw || !String(fechaRaw).includes('/')) {
        return { aprobado: false, motivoRechazo: 'Formato de fecha inválido (usa MM/AA)' };
      }

      const [mes, anioCorto] = String(fechaRaw).split('/');
      const numeroLimpio = (detalles?.numero || '').toString().replace(/\D/g, '');

      // 1. Tokenización de la tarjeta
      const tokenResp = await axios.post(
        `https://api.mercadopago.com/v1/card_tokens?public_key=${PUBLIC_KEY}`,
        {
          card_number:       numeroLimpio,
          expiration_month:  parseInt(mes),
          expiration_year:   parseInt('20' + anioCorto),
          security_code:     detalles?.cvv,
          cardholder: { name: detalles?.titular || 'APRO' },
        },
      );

      // 2. Cobro con el token
      const pagoResp = await axios.post(
        'https://api.mercadopago.com/v1/payments',
        {
          transaction_amount: monto,
          token:              tokenResp.data.id,
          description:        'E-Commerce',
          installments:       1,
          payment_method_id:  numeroLimpio.startsWith('4') ? 'visa' : 'master',
          payer: { email: 'test_user_789@test.com' },
        },
        {
          headers: {
            Authorization:      `Bearer ${ACCESS_TOKEN}`,
            'X-Idempotency-Key': `key-${Date.now()}`,
          },
        },
      );

      if (pagoResp.data.status === 'rejected') {
        return { aprobado: false, motivoRechazo: pagoResp.data.status_detail };
      }

      return { aprobado: true, idTransaccionBanco: pagoResp.data.id.toString() };

    } catch (error: any) {
      const errorMP  = error.response?.data;
      const motivo   = errorMP?.message
        || errorMP?.cause?.[0]?.description
        || 'Error desconocido en la pasarela';

      return { aprobado: false, motivoRechazo: motivo };
    }
  }
}
