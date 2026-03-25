// backend/src/application/procesar-pago.usecase.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DatosPago } from '../domain/pago.interface';

@Injectable()
export class ProcesarPagoUseCase {
  ejecutar(datos: DatosPago) {
    if (!datos.metodo) {
      throw new BadRequestException('El método de pago es obligatorio.');
    }

  let metodoSeguroGuardado: any = null;

    // SIMULACIÓN DE TOKENIZACIÓN (PCI-DSS)
    // Si el usuario pagó con tarjeta y marcó la casilla de guardar:
    if (datos.metodo === 'tarjeta' && datos.guardarMetodo) {
      const numeroTarjeta = datos.detalles.numero.replace(/\s+/g, ''); // Quitamos espacios
      const ultimos4 = numeroTarjeta.slice(-4); // Sacamos los últimos 4 números
      
      // Creamos la bóveda segura que se guardaría en la base de datos
      metodoSeguroGuardado = {
        token: `tok_${Math.random().toString(36).substring(2, 15)}`, // Token seguro
        tarjetaEnmascarada: `**** **** **** ${ultimos4}`,
        mensaje: 'Tarjeta guardada de forma segura para futuras compras'
      };
      
      console.log('🔒 Bóveda de Seguridad: Tarjeta tokenizada exitosamente.', metodoSeguroGuardado);
    }

    // Simulamos que el banco aprobó la transacción de hoy
    return {
      exito: true,
      mensaje: 'Pago registrado con éxito',
      transaccionId: `TX-${Math.floor(Math.random() * 1000000)}`,
      datosGuardados: metodoSeguroGuardado // Devolvemos el token al frontend
    };
  }
}