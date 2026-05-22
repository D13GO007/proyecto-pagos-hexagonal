// CAPA: Dominio — Servicio de dominio (Domain Service)
// HU15: Valida si un cupón puede aplicarse a una compra específica.
// Reglas: vigencia, límite de usos, monto mínimo, un uso por cliente.

import { Cupon } from './cupon.interface';

export interface ResultadoValidacionCupon {
  valido: boolean;
  descuentoAplicado: number;
  motivo?: string;
}

export class ValidadorCupon {
  static validar(
    cupon: Cupon,
    montoCompra: number,
    clienteEmail: string,
  ): ResultadoValidacionCupon {
    if (!cupon.activo) {
      return { valido: false, descuentoAplicado: 0, motivo: 'El cupón está inactivo.' };
    }

    if (new Date(cupon.fechaExpiracion) < new Date()) {
      return { valido: false, descuentoAplicado: 0, motivo: 'El cupón ha expirado.' };
    }

    if (cupon.usosActuales >= cupon.maxUsos) {
      return { valido: false, descuentoAplicado: 0, motivo: 'El cupón ha alcanzado su límite de usos.' };
    }

    // HU15: monto mínimo
    if (montoCompra < cupon.montoMinimo) {
      return {
        valido: false,
        descuentoAplicado: 0,
        motivo: `El monto mínimo para este cupón es $${cupon.montoMinimo.toLocaleString('es-CO')} COP.`,
      };
    }

    // HU15: un solo uso por cliente
    if (clienteEmail && cupon.clientesQueUsaron.includes(clienteEmail)) {
      return { valido: false, descuentoAplicado: 0, motivo: 'Ya utilizaste este cupón anteriormente.' };
    }

    const descuentoAplicado =
      cupon.tipoDescuento === 'porcentaje'
        ? Math.round(montoCompra * (cupon.valorDescuento / 100))
        : Math.min(cupon.valorDescuento, montoCompra);

    return { valido: true, descuentoAplicado };
  }
}
