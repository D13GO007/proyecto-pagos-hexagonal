import { Controller, Post, Body } from '@nestjs/common';
import { EmailService } from '../outbound/email.service';
import {
  CrearSolicitudDevolucionDto,
  ResolverSolicitudDto,
  EscalarSolicitudDto,
  AdminDecisionDto,
} from './dto/devolucion-request.dto';

@Controller('devoluciones')
export class DevolucionController {
  constructor(private readonly emailService: EmailService) {}

  // Cliente envía una solicitud → notificar al vendedor
  @Post()
  async crearSolicitud(@Body() body: CrearSolicitudDevolucionDto) {
    await this.emailService.enviarSolicitudVendedor(body);
    return { ok: true };
  }

  // Vendedor resuelve (aprueba o rechaza) → notificar al cliente
  @Post('resolver')
  async resolverSolicitud(@Body() body: ResolverSolicitudDto) {
    await this.emailService.enviarResolucionCliente(body);
    return { ok: true };
  }

  // Cliente escala al administrador → notificar al admin
  @Post('escalar')
  async escalarSolicitud(@Body() body: EscalarSolicitudDto) {
    await this.emailService.enviarEscalacionAdmin(body);
    return { ok: true };
  }

  // Admin toma decision final → notificar a comprador y vendedor
  @Post('admin-resolver')
  async adminResolver(@Body() body: AdminDecisionDto) {
    await this.emailService.enviarDecisionAdmin(body);
    return { ok: true };
  }
}
