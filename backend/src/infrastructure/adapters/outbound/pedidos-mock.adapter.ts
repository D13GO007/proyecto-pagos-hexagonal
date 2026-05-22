// CAPA: Infraestructura — Adaptador de salida (Outbound Adapter)
// Implementa IPedidosRepositoryPort usando el mapa de pedidos definido en el dominio.
// Única fuente de verdad: BASE_DE_DATOS_PEDIDOS en pedidos.mock.ts.

import { Injectable } from '@nestjs/common';
import { IPedidosRepositoryPort } from '../../../domain/puertos/pedidos-repository.port';
import { Pedido, BASE_DE_DATOS_PEDIDOS } from '../../../domain/pedidos.mock';

@Injectable()
export class PedidosMockAdapter implements IPedidosRepositoryPort {
  buscarPorId(pedidoId: string): Pedido | undefined {
    return BASE_DE_DATOS_PEDIDOS.get(pedidoId);
  }

  guardar(pedido: Pedido): void {
    BASE_DE_DATOS_PEDIDOS.set(pedido.id, pedido);
  }
}
