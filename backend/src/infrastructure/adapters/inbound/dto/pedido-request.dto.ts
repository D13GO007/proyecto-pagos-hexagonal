import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class RegistrarPedidoDto {
  @IsString()
  @IsNotEmpty()
  pedidoId: string;

  @Type(() => Number)
  @IsNumber()
  totalFinal: number;

  @IsOptional()
  @IsString()
  producto?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsEmail()
  clienteEmail?: string;
}
