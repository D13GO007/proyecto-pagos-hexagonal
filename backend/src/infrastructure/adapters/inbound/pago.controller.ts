import { Controller, Post, Body, HttpException, HttpStatus, Inject } from '@nestjs/common';
import type { ICasoUsoPagoPort } from '../../../domain/puertos/caso-uso-pago.port';
import { CASO_USO_PAGO_PORT } from '../../../domain/puertos/caso-uso-pago.port';
import { EmailService } from '../outbound/email.service';

@Controller('pagos')
export class PagoController {
  constructor(
    @Inject(CASO_USO_PAGO_PORT)
    private readonly casoUsoPago: ICasoUsoPagoPort,
    private readonly emailService: EmailService,
  ) {}

  @Post()
  async recibirPago(@Body() body: any) {
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
          metodoPago,
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

  // Endpoint para notificar al vendedor cuando el cliente anula o reembolsa
  @Post('notificar-estado')
  async notificarCambioEstado(@Body() body: any) {
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
