import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEmail } from 'class-validator';

export class NotificarCambioEstadoDto {
  @IsString()
  @IsNotEmpty()
  facturaId: string;

  @IsString()
  @IsNotEmpty()
  pedidoId: string;

  @IsString()
  @IsNotEmpty()
  nuevoEstado: string;

  @Type(() => Number)
  @IsNumber()
  monto: number;

  @IsOptional()
  @IsEmail()
  emailComprador?: string;
}
