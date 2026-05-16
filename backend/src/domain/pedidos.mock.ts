// CAPA: Dominio — Entidad Pedido y datos de prueba
// Define la estructura de un Pedido y los pedidos de prueba disponibles en sandbox.

export interface Pedido {
  id: string;
  totalFinal: number;
  estado: 'PENDIENTE' | 'PAGADO' | 'CANCELADO';
  intentosPorTarjeta: Record<string, number>;
  transaccionId?: string;
}

export const BASE_DE_DATOS_PEDIDOS = new Map<string, Pedido>();
