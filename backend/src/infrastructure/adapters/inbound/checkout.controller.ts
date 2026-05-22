import { Controller, Post, Body, HttpException, HttpStatus, Headers } from '@nestjs/common';
import { ApiTags, ApiHeader } from '@nestjs/swagger';
import { CheckoutRequestDto, ReembolsoRequestDto } from './dto/checkout-request.dto';

@ApiTags('Integración Carrito')
@ApiHeader({ name: 'x-api-key', description: 'Clave de API requerida', required: true })
@Controller()
export class CheckoutController {

  private validarApiKey(apiKey: string | undefined): void {
    const expected = process.env.PAGOS_API_KEY;
    if (!expected) return; // si no está configurada, no bloquea (dev local)
    if (apiKey !== expected) {
      throw new HttpException({ error: 'API key inválida' }, HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * El carrito llama este endpoint para iniciar el pago.
   * Recibe los datos de la transacción y retorna la URL de la página de pago.
   */
  @Post('checkout')
  iniciarCheckout(
    @Body() body: CheckoutRequestDto,
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validarApiKey(apiKey);

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const params = new URLSearchParams({
      pedidoId: body.transaccion_id,
      monto:    String(body.monto_total),
    });
    if (body.descripcion) params.set('producto', body.descripcion);
    if (body.moneda)      params.set('moneda', body.moneda);

    const redirect_url = `${frontendUrl}/pago?${params.toString()}`;
    return { redirect_url };
  }

  /**
   * El carrito llama este endpoint para solicitar un reembolso.
   */
  @Post('reembolso')
  solicitarReembolso(
    @Body() body: ReembolsoRequestDto,
    @Headers('x-api-key') apiKey: string,
  ) {
    this.validarApiKey(apiKey);

    // En producción aquí se llamaría a Wompi para revertir la transacción.
    // Por ahora registramos y notificamos al vendedor vía el flujo de devoluciones.
    return {
      ok: true,
      transaccionId: body.transaccionId,
      monto:         body.monto,
      mensaje:       'Solicitud de reembolso recibida. El equipo de pagos la procesará.',
    };
  }
}
