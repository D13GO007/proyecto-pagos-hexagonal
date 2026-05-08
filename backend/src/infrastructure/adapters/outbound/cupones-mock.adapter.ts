// CAPA: Infraestructura — Adaptador de salida (Outbound Adapter)
// Implementa ICuponRepositoryPort usando una base de datos en memoria (Map).
// Incluye cupones semilla para pruebas de los diferentes escenarios de HU15.

import { Injectable } from '@nestjs/common';
import { ICuponRepositoryPort } from '../../../domain/puertos/cupon-repository.port';
import { Cupon } from '../../../domain/cupon.interface';

const BASE_CUPONES = new Map<string, Cupon>([
  [
    'BIENVENIDO10',
    {
      codigo: 'BIENVENIDO10',
      descripcion: '10% de descuento en tu primera compra',
      tipoDescuento: 'porcentaje',
      valorDescuento: 10,
      montoMinimo: 50000,
      maxUsos: 100,
      usosActuales: 0,
      clientesQueUsaron: [],
      fechaExpiracion: '2027-12-31T23:59:59',
      activo: true,
      vendedorId: 'vendedor-001',
      creadoEn: '2026-01-01T00:00:00',
    },
  ],
  [
    'DESC20MIL',
    {
      codigo: 'DESC20MIL',
      descripcion: '$20.000 de descuento en compras mayores a $100.000',
      tipoDescuento: 'monto',
      valorDescuento: 20000,
      montoMinimo: 100000,
      maxUsos: 50,
      usosActuales: 0,
      clientesQueUsaron: [],
      fechaExpiracion: '2027-12-31T23:59:59',
      activo: true,
      vendedorId: 'vendedor-001',
      creadoEn: '2026-01-01T00:00:00',
    },
  ],
  [
    'VERANO30',
    {
      codigo: 'VERANO30',
      descripcion: '30% descuento — Promoción de verano (expirado)',
      tipoDescuento: 'porcentaje',
      valorDescuento: 30,
      montoMinimo: 0,
      maxUsos: 200,
      usosActuales: 0,
      clientesQueUsaron: [],
      fechaExpiracion: '2025-03-01T00:00:00',
      activo: true,
      vendedorId: 'vendedor-001',
      creadoEn: '2025-01-01T00:00:00',
    },
  ],
]);

@Injectable()
export class CuponesMockAdapter implements ICuponRepositoryPort {
  buscarPorCodigo(codigo: string): Cupon | undefined {
    return BASE_CUPONES.get(codigo.toUpperCase());
  }

  listar(): Cupon[] {
    return Array.from(BASE_CUPONES.values());
  }

  guardar(cupon: Cupon): void {
    BASE_CUPONES.set(cupon.codigo.toUpperCase(), cupon);
  }

  marcarUsado(codigo: string, clienteEmail: string): void {
    const cupon = BASE_CUPONES.get(codigo.toUpperCase());
    if (cupon) {
      cupon.usosActuales += 1;
      if (clienteEmail && !cupon.clientesQueUsaron.includes(clienteEmail)) {
        cupon.clientesQueUsaron.push(clienteEmail);
      }
      BASE_CUPONES.set(codigo.toUpperCase(), cupon);
    }
  }
}
