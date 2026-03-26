import { Injectable, BadRequestException } from '@nestjs/common';
import { DatosPago } from '../domain/pago.interface';
import { calcularTotal } from './calcular-impuesto.usecase';

@Injectable()
export class ProcesarPagoUseCase {
  ejecutar(datos: DatosPago) {
    if (!datos.metodo) {
      throw new BadRequestException('El método de pago es obligatorio.');
    }

    // INTEGRAMOS HUO18
    const resultadoFinanciero = calcularTotal(
      datos.monto,
      datos.detalles?.ubicacion || "local"
    );

    let metodoSeguroGuardado: any = null;

    // (igual que antes)
    if (datos.metodo === 'tarjeta' && datos.guardarMetodo) {
      const numeroTarjeta = datos.detalles.numero.replace(/\s+/g, '');
      const ultimos4 = numeroTarjeta.slice(-4);

      metodoSeguroGuardado = {
        token: `tok_${Math.random().toString(36).substring(2, 15)}`,
        tarjetaEnmascarada: `**** **** **** ${ultimos4}`,
        mensaje: 'Tarjeta guardada de forma segura para futuras compras'
      };

      console.log('🔒 Tarjeta tokenizada:', metodoSeguroGuardado);
    }

    return {
      exito: true,
      mensaje: 'Pago procesado correctamente',

      
      transaccionId: `TX-${Math.floor(Math.random() * 1000000)}`,

      //  APORTE
      detallePago: resultadoFinanciero,

      // seguridad
      datosGuardados: metodoSeguroGuardado
    };
  }
}