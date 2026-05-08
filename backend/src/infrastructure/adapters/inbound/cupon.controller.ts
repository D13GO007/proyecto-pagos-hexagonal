// CAPA: Infraestructura — Adaptador de entrada (Inbound Adapter)
// Expone los endpoints REST del módulo de cupones.
// HU13: POST /cupones (crear), GET /cupones (listar vendedor)
// HU14: POST /cupones/validar (validar código en checkout)
//       POST /cupones/aplicar  (marcar usado tras pago exitoso)

import { Controller, Get, Post, Body } from '@nestjs/common';
import { GestionarCuponUseCase } from '../../../application/gestionar-cupon.usecase';

@Controller('cupones')
export class CuponController {
  constructor(private readonly cuponUseCase: GestionarCuponUseCase) {}

  // HU13: vendedor lista sus cupones
  @Get()
  listar() {
    return this.cuponUseCase.listar();
  }

  // HU13: vendedor crea un nuevo cupón
  @Post()
  crear(@Body() body: any) {
    return this.cuponUseCase.crear(body);
  }

  // HU14 + HU15: cliente valida un código de cupón en checkout
  @Post('validar')
  validar(@Body() body: { codigo: string; monto: number; clienteEmail?: string }) {
    const { codigo, monto, clienteEmail } = body;
    return this.cuponUseCase.validar(codigo || '', monto || 0, clienteEmail || '');
  }

  // Llamado internamente tras pago aprobado — marca el cupón como usado
  @Post('aplicar')
  aplicar(@Body() body: { codigo: string; clienteEmail?: string }) {
    this.cuponUseCase.marcarUsado(body.codigo || '', body.clienteEmail || '');
    return { ok: true };
  }
}
