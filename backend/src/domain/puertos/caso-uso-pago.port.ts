// CAPA: Dominio — Puerto de entrada (Inbound Port)
// Define el contrato que el mundo exterior puede invocar sobre el núcleo del sistema.
// Los adaptadores de entrada (controladores, CLI, tests) dependen de esta interfaz,
// nunca directamente del caso de uso concreto.

export const CASO_USO_PAGO_PORT = 'ICasoUsoPagoPort';

export interface DatosEjecutarPago {
  pedidoId: string;
  datosPago: any;
  totalCobrado: number;
  metodoPago?: string;
  // HU10: descuento aplicado (automático + cupón combinados)
  descuentoAplicado?: number;
  // HU14: código del cupón para validar y marcar como usado
  cuponCodigo?: string;
  clienteEmail?: string;
}

export interface ICasoUsoPagoPort {
  ejecutar(datos: DatosEjecutarPago): Promise<any>;
}
