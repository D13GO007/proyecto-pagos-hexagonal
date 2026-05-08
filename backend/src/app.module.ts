// CAPA: Infraestructura — Módulo raíz de NestJS
// Registra todos los adaptadores y conecta cada puerto con su implementación concreta.
// Es el único lugar donde se conocen simultáneamente el dominio y la infraestructura.

import { Module } from '@nestjs/common';
import { PagoController } from './infrastructure/adapters/inbound/pago.controller';
import { CuponController } from './infrastructure/adapters/inbound/cupon.controller';
import { DevolucionController } from './infrastructure/adapters/inbound/devolucion.controller';
import { ProcesarPagoUseCase } from './application/procesar-pago.usecase';
import { GestionarCuponUseCase } from './application/gestionar-cupon.usecase';
import { PedidosMockAdapter } from './infrastructure/adapters/outbound/pedidos-mock.adapter';
import { SandboxMercadoPagoAdapter } from './infrastructure/adapters/outbound/sandbox-mercadopago.adapter';
import { CuponesMockAdapter } from './infrastructure/adapters/outbound/cupones-mock.adapter';
import { EmailService } from './infrastructure/adapters/outbound/email.service';
import { PEDIDOS_REPOSITORY_PORT } from './domain/puertos/pedidos-repository.port';
import { PASARELA_PAGO_PORT } from './domain/puertos/pasarela-pago.port';
import { CASO_USO_PAGO_PORT } from './domain/puertos/caso-uso-pago.port';
import { CUPON_REPOSITORY_PORT } from './domain/puertos/cupon-repository.port';

@Module({
  imports: [],
  controllers: [PagoController, CuponController, DevolucionController],
  providers: [
    // Puerto de entrada: caso de uso de pago
    {
      provide: CASO_USO_PAGO_PORT,
      useClass: ProcesarPagoUseCase,
    },

    // Adaptador de salida: repositorio de pedidos en memoria
    {
      provide: PEDIDOS_REPOSITORY_PORT,
      useClass: PedidosMockAdapter,
    },

    // Adaptador de salida: pasarela de pago (Mercado Pago Sandbox)
    {
      provide: PASARELA_PAGO_PORT,
      useClass: SandboxMercadoPagoAdapter,
    },

    // Adaptador de salida: repositorio de cupones en memoria
    {
      provide: CUPON_REPOSITORY_PORT,
      useClass: CuponesMockAdapter,
    },

    // Caso de uso: gestión de cupones (HU13, HU14, HU15)
    GestionarCuponUseCase,

    // Adaptador de salida: servicio de notificaciones por correo
    EmailService,
  ],
})
export class AppModule {}
