import { Controller, Post, Body } from '@nestjs/common';
import { validarMontoConImpuesto } from './pagos';

interface PagoBody {
  montoBase: number;
  total: number;
}

@Controller('pagos')
export class JhonpagosController {
  @Post('validar')
  validar(@Body() body: PagoBody) {
    const { montoBase, total } = body;
    return validarMontoConImpuesto(montoBase, total);
  }
}