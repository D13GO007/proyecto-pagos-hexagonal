// CAPA: Dominio — Puerto de salida (Outbound Port)
// Contrato que define cómo el dominio solicita el procesamiento de pagos
// a cualquier pasarela externa, sin acoplarse a ninguna implementación concreta.

export const PASARELA_PAGO_PORT = 'IPasarelaPagoPort';

export interface RespuestaTransaccion {
  aprobado: boolean;
  esAsincrono?: boolean;
  linkPago?: string;
  motivoRechazo?: string;
  idTransaccionBanco?: string;
}

export interface IPasarelaPagoPort {
  procesarPago(metodo: string, detalles: any, monto: number): Promise<RespuestaTransaccion>;
}
