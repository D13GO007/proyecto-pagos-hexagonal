// CAPA: Dominio — Puerto de salida (Outbound Port)
// Define el contrato que el caso de uso necesita del mundo exterior
// para consultar y persistir pedidos, sin conocer el mecanismo real.

import { Pedido } from '../pedidos.mock';

export const PEDIDOS_REPOSITORY_PORT = 'IPedidosRepositoryPort';

export interface IPedidosRepositoryPort {
  buscarPorId(pedidoId: string): Pedido | undefined;
  guardar(pedido: Pedido): void;
}
