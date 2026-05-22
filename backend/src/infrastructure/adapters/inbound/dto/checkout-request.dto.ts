import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CheckoutRequestDto {
  @IsString()
  @IsNotEmpty()
  transaccion_id: string;

  @Type(() => Number)
  @IsNumber()
  monto_total: number;

  @IsOptional()
  @IsArray()
  items?: unknown[];

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  moneda?: string;
}

export class ReembolsoRequestDto {
  @IsString()
  @IsNotEmpty()
  transaccionId: string;

  @Type(() => Number)
  @IsNumber()
  monto: number;
}
