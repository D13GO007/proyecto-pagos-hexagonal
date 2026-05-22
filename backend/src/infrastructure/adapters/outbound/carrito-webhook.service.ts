import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CarritoWebhookService {
  private readonly logger = new Logger(CarritoWebhookService.name);

  async notificarPagoConfirmado(params: {
    transaccionId: string;
    monto: number;
    estado: 'APROBADA' | 'RECHAZADA';
  }): Promise<void> {
    const carritoUrl = process.env.CARRITO_SERVICE_URL;
    const webhookSecret = process.env.PAGOS_WEBHOOK_SECRET;

    if (!carritoUrl || !webhookSecret) {
      this.logger.warn('CARRITO_SERVICE_URL o PAGOS_WEBHOOK_SECRET no configurados, omitiendo webhook');
      return;
    }

    const payload = {
      referencia_pago_externa: params.transaccionId,
      estado: params.estado,
      monto: params.monto,
    };

    const firma = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    try {
      const response = await fetch(`${carritoUrl}/api/carrito/pago-confirmado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': firma,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.error(`Webhook al carrito fallido: ${response.status} ${response.statusText}`);
      } else {
        this.logger.log(`Webhook enviado al carrito para transacción ${params.transaccionId}`);
      }
    } catch (err: any) {
      this.logger.error(`Error enviando webhook al carrito: ${err?.message}`);
    }
  }
}
