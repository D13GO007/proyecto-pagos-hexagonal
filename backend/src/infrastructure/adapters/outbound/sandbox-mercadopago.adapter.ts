// CAPA: Infraestructura — Adaptador de salida (Outbound Adapter)
// Implementa IPasarelaPagoPort usando la API de Mercado Pago (sandbox)
// y simuladores locales para los métodos asincrónicos (PSE, Nequi, Efectivo).

import { Injectable } from '@nestjs/common';
import { IPasarelaPagoPort, RespuestaTransaccion } from '../../../domain/puertos/pasarela-pago.port';

// En el sandbox de pruebas, el cobro con tarjeta se aprueba directamente sin llamar a Mercado Pago.

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

      // Método síncrono: tarjeta de crédito/débito
      // En entorno de pruebas, siempre se aprueba el pago sin importar la tarjeta.
      return {
        aprobado: true,
        idTransaccionBanco: `CARD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };

    } catch (error: any) {
      const errorMP  = error.response?.data;
      const motivo   = errorMP?.message
        || errorMP?.cause?.[0]?.description
        || 'Error desconocido en la pasarela';

      return { aprobado: false, motivoRechazo: motivo };
    }
  }
}
