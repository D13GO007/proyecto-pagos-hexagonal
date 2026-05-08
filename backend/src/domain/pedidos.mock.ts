// CAPA: Dominio — Entidad Pedido y datos de prueba
// Define la estructura de un Pedido y los pedidos de prueba disponibles en sandbox.

export interface Pedido {
  id: string;
  totalFinal: number;
  estado: 'PENDIENTE' | 'PAGADO' | 'CANCELADO';
  intentosPorTarjeta: Record<string, number>;
  transaccionId?: string;
}

export const BASE_DE_DATOS_PEDIDOS = new Map<string, Pedido>([
  ['PED-101', { id: 'PED-101', totalFinal: 172500, estado: 'PENDIENTE',  intentosPorTarjeta: {} }],
  ['PED-102', { id: 'PED-102', totalFinal: 335000, estado: 'PENDIENTE',  intentosPorTarjeta: {} }],
  ['PED-103', { id: 'PED-103', totalFinal: 927500, estado: 'PENDIENTE',  intentosPorTarjeta: {} }],
  ['PED-104', { id: 'PED-104', totalFinal: 62500,  estado: 'PENDIENTE',  intentosPorTarjeta: {} }],
  ['PED-456', { id: 'PED-456', totalFinal: 94000,  estado: 'PAGADO',     intentosPorTarjeta: {} }],
  ['PED-CAN', { id: 'PED-CAN', totalFinal: 141000, estado: 'CANCELADO',  intentosPorTarjeta: {} }],
  // Simula tarjeta Visa bloqueada por 3 intentos fallidos (HU06)
  ['PED-789', { id: 'PED-789', totalFinal: 225000, estado: 'PENDIENTE',  intentosPorTarjeta: { '4013440111111111': 3 } }],
]);
