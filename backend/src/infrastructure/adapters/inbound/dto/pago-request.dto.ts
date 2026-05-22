import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEmail, IsObject } from 'class-validator';

export class PagoRequestDto {
  @IsString()
  @IsNotEmpty()
  pedidoId: string;

  @IsOptional()
  @IsObject()
  datosPago?: Record<string, unknown>;

  @Type(() => Number)
  @IsNumber()
  totalCobrado: number;

  @IsOptional()
  @IsString()
  metodoPago?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  descuentoAplicado?: number;

  @IsOptional()
  @IsString()
  cuponCodigo?: string;

  @IsOptional()
  @IsEmail()
  clienteEmail?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  subtotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  transporte?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  iva?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  porcentajeIva?: number;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  tipoImpuesto?: string;
}
