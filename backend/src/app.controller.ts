import { Controller, Get, Query } from '@nestjs/common';
import { calcularTotal } from './application/calcular-impuesto.usecase';

@Controller('impuesto')
export class AppController {

  @Get()
  calcular(@Query('precio') precio: string) {

    //  VALIDACIONES
    const valor = parseFloat(precio);

    if (!precio) {
      return { error: "Debe enviar un precio" };
    }

    if (isNaN(valor)) {
      return { error: "El precio debe ser numérico" };
    }

    if (valor <= 0) {
      return { error: "El precio debe ser mayor a 0" };
    }

    if (valor > 1000000000) {
      return { error: "Valor demasiado alto" };
    }

    // 🟢 LÓGICA
    return calcularTotal(valor);
  }
}