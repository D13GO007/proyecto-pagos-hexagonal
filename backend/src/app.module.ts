// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { PagoController } from './infrastructure/adapters/inbound/pago.controller';
import { ProcesarPagoUseCase } from './application/procesar-pago.usecase';

@Module({
  imports: [],
  controllers: [PagoController],
  providers: [ProcesarPagoUseCase],
})
export class AppModule {}