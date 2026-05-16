import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn, IsEmail, Min } from 'class-validator';

export class CrearSolicitudDevolucionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  facturaId: string;

  @IsString()
  @IsNotEmpty()
  pedidoId: string;

  @IsEmail()
  @IsNotEmpty()
  emailComprador: string;

  @IsString()
  @IsIn(['ANULACION', 'DEVOLUCION'])
  tipo: 'ANULACION' | 'DEVOLUCION';

  @IsString()
  @IsNotEmpty()
  motivo: string;

  @IsNumber()
  @Min(0)
  monto: number;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class ResolverSolicitudDto {
  @IsString()
  @IsNotEmpty()
  facturaId: string;

  @IsString()
  @IsNotEmpty()
  pedidoId: string;

  @IsEmail()
  @IsNotEmpty()
  emailComprador: string;

  @IsString()
  @IsIn(['ANULACION', 'DEVOLUCION'])
  tipo: 'ANULACION' | 'DEVOLUCION';

  @IsString()
  @IsIn(['APROBADA', 'RECHAZADA'])
  decision: 'APROBADA' | 'RECHAZADA';

  @IsString()
  @IsNotEmpty()
  motivo: string;

  @IsOptional()
  @IsString()
  motivoRechazo?: string;

  @IsNumber()
  @Min(0)
  monto: number;
}

export class EscalarSolicitudDto {
  @IsString()
  @IsNotEmpty()
  solicitudId: string;

  @IsString()
  @IsNotEmpty()
  facturaId: string;

  @IsString()
  @IsNotEmpty()
  pedidoId: string;

  @IsEmail()
  @IsNotEmpty()
  emailComprador: string;

  @IsString()
  @IsIn(['ANULACION', 'DEVOLUCION'])
  tipo: 'ANULACION' | 'DEVOLUCION';

  @IsString()
  @IsNotEmpty()
  motivo: string;

  @IsOptional()
  @IsString()
  motivoRechazo?: string;

  @IsOptional()
  @IsString()
  reclamacion?: string;

  @IsNumber()
  @Min(0)
  monto: number;
}

export class AdminDecisionDto {
  @IsString()
  @IsNotEmpty()
  facturaId: string;

  @IsString()
  @IsNotEmpty()
  pedidoId: string;

  @IsEmail()
  @IsNotEmpty()
  emailComprador: string;

  @IsString()
  @IsIn(['ANULACION', 'DEVOLUCION'])
  tipo: 'ANULACION' | 'DEVOLUCION';

  @IsString()
  @IsIn(['APROBADA', 'RECHAZADA'])
  decision: 'APROBADA' | 'RECHAZADA';

  @IsOptional()
  @IsString()
  adminMotivo?: string;

  @IsNumber()
  @Min(0)
  monto: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}
