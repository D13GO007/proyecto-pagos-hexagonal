import { Controller, Post, Get, Param, Body, HttpException, HttpStatus, Inject } from '@nestjs/common';
import type { IPedidosRepositoryPort } from '../../../domain/puertos/pedidos-repository.port';
import { PEDIDOS_REPOSITORY_PORT } from '../../../domain/puertos/pedidos-repository.port';
import { RegistrarPedidoDto } from './dto/pedido-request.dto';

@Controller('pedidos')
export class PedidoController {
  constructor(
    @Inject(PEDIDOS_REPOSITORY_PORT)
    private readonly pedidosRepo: IPedidosRepositoryPort,
  ) {}

  // Otros módulos llaman este endpoint para registrar un pedido antes de redirigir al checkout
  @Post()
  registrar(@Body() body: RegistrarPedidoDto) {
    const existente = this.pedidosRepo.buscarPorId(body.pedidoId);
    if (existente?.estado === 'CANCELADO') {
      throw new HttpException('El pedido está cancelado y no admite pagos.', HttpStatus.BAD_REQUEST);
    }
    if (!existente) {
      this.pedidosRepo.guardar({
        id: body.pedidoId,
        totalFinal: body.totalFinal,
        estado: 'PENDIENTE',
        intentosPorTarjeta: {},
      });
    }
    return { ok: true, pedidoId: body.pedidoId };
  }

  // Consulta el estado de un pedido (útil para otros módulos)
  @Get(':id')
  consultar(@Param('id') id: string) {
    const pedido = this.pedidosRepo.buscarPorId(id);
    if (!pedido) {
      throw new HttpException('Pedido no encontrado.', HttpStatus.NOT_FOUND);
    }
    return {
      pedidoId: pedido.id,
      estado: pedido.estado,
      totalFinal: pedido.totalFinal,
      transaccionId: pedido.transaccionId ?? null,
    };
  }
}
