import { Controller, Get, Query } from '@nestjs/common';
import { PagosService } from './pagos.service';

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get('calcular')
  calcular(
    @Query('precio') precio: string,
    @Query('pais') pais: string
  ) {
    return this.pagosService.calcularTotal(Number(precio), pais);
  }
}
