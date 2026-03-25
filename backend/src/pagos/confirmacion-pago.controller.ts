import { Controller, Get, Param } from '@nestjs/common';
import { ConfirmacionPagoService } from './confirmacion-pago.service';

@Controller('pagos')
export class ConfirmacionPagoController {

  constructor(private readonly service: ConfirmacionPagoService) {}

  @Get('confirmar/:id')
  confirmar(@Param('id') id: string) {
    return this.service.confirmarPago(id);
  }
}
