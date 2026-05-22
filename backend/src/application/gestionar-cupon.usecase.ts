// CAPA: Aplicación — Caso de uso Cupones
// HU13: crear cupones con límite de usos y fecha de expiración.
// HU14: validar código de cupón en checkout.
// HU15: reglas de negocio (monto mínimo, un uso por cliente, expiración).

import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import type { ICuponRepositoryPort } from '../domain/puertos/cupon-repository.port';
import { CUPON_REPOSITORY_PORT } from '../domain/puertos/cupon-repository.port';
import { ValidadorCupon } from '../domain/validador-cupon.domain';
import { Cupon } from '../domain/cupon.interface';

export interface CrearCuponDto {
  codigo: string;
  descripcion: string;
  tipoDescuento: 'porcentaje' | 'monto';
  valorDescuento: number;
  montoMinimo: number;
  maxUsos: number;
  fechaExpiracion: string;
  vendedorId?: string;
}

@Injectable()
export class GestionarCuponUseCase {
  constructor(
    @Inject(CUPON_REPOSITORY_PORT)
    private readonly cuponRepo: ICuponRepositoryPort,
  ) {}

  // HU13: vendedor crea un cupón
  crear(dto: CrearCuponDto): Cupon {
    const codigoNormalizado = dto.codigo.trim().toUpperCase();

    if (!codigoNormalizado) throw new BadRequestException('El código del cupón no puede estar vacío.');
    if (dto.valorDescuento <= 0) throw new BadRequestException('El valor del descuento debe ser mayor a 0.');
    if (dto.tipoDescuento === 'porcentaje' && dto.valorDescuento > 100) {
      throw new BadRequestException('El porcentaje de descuento no puede superar 100%.');
    }
    if (dto.maxUsos < 1) throw new BadRequestException('El límite de usos debe ser al menos 1.');
    if (new Date(dto.fechaExpiracion) <= new Date()) {
      throw new BadRequestException('La fecha de expiración debe ser futura.');
    }
    if (this.cuponRepo.buscarPorCodigo(codigoNormalizado)) {
      throw new BadRequestException(`Ya existe un cupón con el código "${codigoNormalizado}".`);
    }

    const nuevo: Cupon = {
      codigo: codigoNormalizado,
      descripcion: dto.descripcion || '',
      tipoDescuento: dto.tipoDescuento,
      valorDescuento: dto.valorDescuento,
      montoMinimo: dto.montoMinimo || 0,
      maxUsos: dto.maxUsos,
      usosActuales: 0,
      clientesQueUsaron: [],
      fechaExpiracion: dto.fechaExpiracion,
      activo: true,
      vendedorId: dto.vendedorId || 'vendedor-001',
      creadoEn: new Date().toISOString(),
    };

    this.cuponRepo.guardar(nuevo);
    return nuevo;
  }

  // HU13: listar todos los cupones del vendedor
  listar(): Cupon[] {
    return this.cuponRepo.listar();
  }

  // HU14 + HU15: validar cupón en checkout
  validar(
    codigo: string,
    montoCompra: number,
    clienteEmail: string,
  ): { valido: boolean; descuentoAplicado: number; cupon?: Partial<Cupon>; motivo?: string } {
    const cupon = this.cuponRepo.buscarPorCodigo(codigo);
    if (!cupon) {
      return { valido: false, descuentoAplicado: 0, motivo: 'Cupón no encontrado.' };
    }

    const resultado = ValidadorCupon.validar(cupon, montoCompra, clienteEmail);

    if (!resultado.valido) {
      return { valido: false, descuentoAplicado: 0, motivo: resultado.motivo };
    }

    return {
      valido: true,
      descuentoAplicado: resultado.descuentoAplicado,
      cupon: {
        codigo: cupon.codigo,
        descripcion: cupon.descripcion,
        tipoDescuento: cupon.tipoDescuento,
        valorDescuento: cupon.valorDescuento,
        montoMinimo: cupon.montoMinimo,
        usosActuales: cupon.usosActuales,
        maxUsos: cupon.maxUsos,
      },
    };
  }

  // Llamado por ProcesarPagoUseCase tras pago aprobado con cupón
  marcarUsado(codigo: string, clienteEmail: string): void {
    this.cuponRepo.marcarUsado(codigo, clienteEmail);
  }
}
