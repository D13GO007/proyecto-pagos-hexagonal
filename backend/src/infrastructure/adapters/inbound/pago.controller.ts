// backend/src/infrastructure/adapters/inbound/pago.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ProcesarPagoUseCase } from '../../../application/procesar-pago.usecase';
import { DatosPago } from '../../../domain/pago.interface';

@Controller('api/pagos')
export class PagoController {
  constructor(private readonly procesarPagoUseCase: ProcesarPagoUseCase) {}

  @Post('procesar')
  recibirPago(@Body() body: DatosPago) {
    console.log('Datos recibidos desde el Frontend:', body);
    return this.procesarPagoUseCase.ejecutar(body);
  }
}