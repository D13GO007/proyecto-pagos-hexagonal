import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEmail, IsIn, Min, Max, IsISO8601 } from 'class-validator';

export class CrearCuponRequestDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsString()
  @IsIn(['porcentaje', 'monto'])
  tipoDescuento: 'porcentaje' | 'monto';

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  valorDescuento: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  montoMinimo: number;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  maxUsos: number;

  @IsString()
  @IsISO8601()
  fechaExpiracion: string;

  @IsOptional()
  @IsString()
  vendedorId?: string;
}

export class ValidarCuponDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsNumber()
  @Type(() => Number)
  monto: number;

  @IsOptional()
  @IsEmail()
  clienteEmail?: string;
}

export class AplicarCuponDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsOptional()
  @IsEmail()
  clienteEmail?: string;
}
