import { Controller, Post, Get, Param, Body, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { ICasoUsoPagoPort } from '../../../domain/puertos/caso-uso-pago.port';
import { CASO_USO_PAGO_PORT } from '../../../domain/puertos/caso-uso-pago.port';
import type { IPasarelaPagoPort } from '../../../domain/puertos/pasarela-pago.port';
import { PASARELA_PAGO_PORT } from '../../../domain/puertos/pasarela-pago.port';
import { EmailService } from '../outbound/email.service';
import { CarritoWebhookService } from '../outbound/carrito-webhook.service';
import { PagoRequestDto } from './dto/pago-request.dto';
import { NotificarCambioEstadoDto } from './dto/notificar-cambio-estado.dto';

@ApiTags('Pagos')
@Controller('pagos')
export class PagoController {
  constructor(
    @Inject(CASO_USO_PAGO_PORT)
    private readonly casoUsoPago: ICasoUsoPagoPort,
    @Inject(PASARELA_PAGO_PORT)
    private readonly pasarela: IPasarelaPagoPort,
    private readonly emailService: EmailService,
    private readonly carritoWebhook: CarritoWebhookService,
  ) {}

  @Post()
  async recibirPago(@Body() body: PagoRequestDto) {
    const {
      datosPago, totalCobrado, pedidoId, metodoPago,
      clienteEmail, subtotal, transporte, iva, porcentajeIva,
    } = body;

    try {
      const resultado = await this.casoUsoPago.ejecutar({
        pedidoId,
        datosPago,
        totalCobrado,
        metodoPago,
        descuentoAplicado: body.descuentoAplicado,
        cuponCodigo:       body.cuponCodigo,
        clienteEmail:      clienteEmail,
      });

      if (resultado.aprobado) {
        const datosMail = {
          transaccionId: resultado.transaccionId,
          pedidoId,
          monto: totalCobrado,
          metodoPago: metodoPago ?? 'TARJETA',
          emailComprador: clienteEmail || process.env.EMAIL_COMPRADOR || '',
          subtotal:       subtotal     ?? totalCobrado,
          transporte:     transporte   ?? 0,
          iva:            iva          ?? 0,
          porcentajeIva:  porcentajeIva ?? 5,
          esAsincrono:    resultado.esAsincrono ?? false,
        };

        Promise.all([
          this.emailService.enviarConfirmacionComprador(datosMail),
          this.emailService.enviarNotificacionVendedor(datosMail),
          this.carritoWebhook.notificarPagoConfirmado({
            transaccionId: pedidoId,
            monto: totalCobrado,
            estado: 'APROBADA',
          }),
        ]).catch(() => {});
      }

      return resultado;
    } catch (error: any) {
      throw new HttpException(
        error?.message ?? 'Error en validacion de pago',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Consulta el estado real de una transacción PSE / NEQUI en Wompi
  @Get('estado/:id')
  async consultarEstado(@Param('id') id: string) {
    try {
      if (!this.pasarela.consultarTransaccion) {
        return { aprobado: false, estado: 'ERROR', motivoRechazo: 'El adaptador no soporta consulta de estado.' };
      }
      return await this.pasarela.consultarTransaccion(id);
    } catch (err: any) {
      throw new HttpException(err?.message ?? 'Error al consultar estado en Wompi', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Endpoint para notificar al vendedor cuando el cliente anula o reembolsa
  @Post('notificar-estado')
  async notificarCambioEstado(@Body() body: NotificarCambioEstadoDto) {
    const { facturaId, pedidoId, nuevoEstado, monto, emailComprador } = body;
    try {
      await this.emailService.enviarCambioEstadoVendedor({
        facturaId,
        pedidoId,
        nuevoEstado,
        monto,
        emailComprador: emailComprador || process.env.EMAIL_COMPRADOR || '',
      });
      return { ok: true };
    } catch (error: any) {
      throw new HttpException(
        error?.message ?? 'Error al enviar notificacion',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
