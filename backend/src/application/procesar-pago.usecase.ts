// CAPA: Aplicación — Caso de uso (implementa el Puerto de Entrada)
// Orquesta la lógica de negocio: consulta el repositorio de pedidos,
// valida el cobro usando servicios del dominio y delega el pago a la pasarela externa.

import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import type { IPedidosRepositoryPort } from '../domain/puertos/pedidos-repository.port';
import { PEDIDOS_REPOSITORY_PORT } from '../domain/puertos/pedidos-repository.port';
import type { IPasarelaPagoPort } from '../domain/puertos/pasarela-pago.port';
import { PASARELA_PAGO_PORT } from '../domain/puertos/pasarela-pago.port';
import type { ICasoUsoPagoPort, DatosEjecutarPago } from '../domain/puertos/caso-uso-pago.port';
import type { ICuponRepositoryPort } from '../domain/puertos/cupon-repository.port';
import { CUPON_REPOSITORY_PORT } from '../domain/puertos/cupon-repository.port';
import { ValidadorImpuestos } from '../domain/validador-impuestos.domain';
import { ValidadorCupon } from '../domain/validador-cupon.domain';

@Injectable()
export class ProcesarPagoUseCase implements ICasoUsoPagoPort {

  constructor(
    @Inject(PEDIDOS_REPOSITORY_PORT)
    private readonly pedidosRepo: IPedidosRepositoryPort,

    @Inject(PASARELA_PAGO_PORT)
    private readonly pasarelaExterna: IPasarelaPagoPort,

    @Inject(CUPON_REPOSITORY_PORT)
    private readonly cuponRepo: ICuponRepositoryPort,
  ) {}

  async ejecutar(datos: DatosEjecutarPago) {

    // ==========================================
    // 1. VALIDACIONES DE ESTADO DEL PEDIDO (HUO6)
    // ==========================================
    const pedido = this.pedidosRepo.buscarPorId(datos.pedidoId);

    if (!pedido) throw new BadRequestException('2. Pedido Inexistente.');
    if (pedido.estado === 'PAGADO') throw new BadRequestException('El producto no puede estar previamente pagado.');
    if (pedido.estado === 'CANCELADO') throw new BadRequestException('5. El pedido ha sido cancelado y no admite más transacciones.');

    const detallesPago = datos?.datosPago?.detalles ?? datos?.datosPago;
    const numeroLimpio = (detallesPago?.numero || '').toString().replace(/\D/g, '');
    const intentosActuales = pedido.intentosPorTarjeta[numeroLimpio] || 0;

    if (numeroLimpio && intentosActuales >= 3) {
      throw new BadRequestException('Seguridad: Esta tarjeta ha sido bloqueada por exceso de intentos fallidos. Por favor, usa otra tarjeta.');
    }

    // ==========================================
    // 2. HU10: VALIDACIÓN DE DESCUENTOS Y MONTO FINAL
    // Si hay descuento aplicado (automático o cupón), el totalCobrado
    // debe ser exactamente: pedido.totalFinal - descuentoAplicado.
    // ==========================================
    const descuentoAplicado = datos.descuentoAplicado || 0;
    const totalEsperado = pedido.totalFinal - descuentoAplicado;

    // Si viene cupón, validarlo independientemente en el dominio
    if (datos.cuponCodigo) {
      const cupon = this.cuponRepo.buscarPorCodigo(datos.cuponCodigo);
      if (!cupon) {
        throw new BadRequestException('El cupón indicado no existe.');
      }
      const resultadoCupon = ValidadorCupon.validar(
        cupon,
        pedido.totalFinal,
        datos.clienteEmail || '',
      );
      if (!resultadoCupon.valido) {
        throw new BadRequestException(`Cupón inválido: ${resultadoCupon.motivo}`);
      }
    }

    try {
      ValidadorImpuestos.validarCobroExacto(
        totalEsperado,
        0,
        0,
        datos.totalCobrado,
      );
    } catch {
      throw new BadRequestException(`4. Monto Incorrecto/insuficiente. El sistema espera $${totalEsperado.toLocaleString('es-CO')}.`);
    }

    const metodoPasarela = (datos.metodoPago || '').toUpperCase() || 'TARJETA';

    // ==========================================
    // 3. CONTACTO CON LA PASARELA EXTERNA (adaptador de infraestructura)
    // ==========================================
    console.log(`Validaciones internas exitosas. Contactando pasarela para: ${metodoPasarela}...`);

    const respuestaBanco = await this.pasarelaExterna.procesarPago(
      metodoPasarela,
      detallesPago,
      datos.totalCobrado,
    );

    if (!respuestaBanco.aprobado) {
      if (numeroLimpio) {
        pedido.intentosPorTarjeta[numeroLimpio] = intentosActuales + 1;
        this.pedidosRepo.guardar(pedido);
      }

      let mensajeUsuario = 'El pago fue rechazado por el banco.';
      if (respuestaBanco.motivoRechazo === 'cc_rejected_insufficient_amount') {
        mensajeUsuario = 'Tu tarjeta no tiene fondos suficientes para completar esta compra.';
      } else if (respuestaBanco.motivoRechazo === 'cc_rejected_bad_filled_security_code') {
        mensajeUsuario = 'El código de seguridad es incorrecto.';
      } else if (respuestaBanco.motivoRechazo) {
        mensajeUsuario = respuestaBanco.motivoRechazo;
      }

      throw new BadRequestException(`1. Datos invalidos/Erroneos: ${mensajeUsuario}`);
    }

    // ==========================================
    // 4. PAGO APROBADO — ACTUALIZAR ESTADO Y MARCAR CUPÓN USADO
    // ==========================================
    const idTransaccionInterna = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    pedido.transaccionId = idTransaccionInterna;

    // Marcar cupón como usado si viene en la solicitud
    if (datos.cuponCodigo && !respuestaBanco.esAsincrono) {
      this.cuponRepo.marcarUsado(datos.cuponCodigo, datos.clienteEmail || '');
    }

    if (respuestaBanco.esAsincrono) {
      pedido.estado = 'PENDIENTE';
      this.pedidosRepo.guardar(pedido);
      return {
        aprobado: true,
        exito: true,
        esAsincrono: true,
        mensaje: 'Recibo generado correctamente. Completa tu pago usando el siguiente enlace de Mercado Pago.',
        linkPago: respuestaBanco.linkPago,
        transaccionId: idTransaccionInterna,
      };
    }

    pedido.estado = 'PAGADO';
    if (numeroLimpio) {
      pedido.intentosPorTarjeta[numeroLimpio] = 0;
    }
    this.pedidosRepo.guardar(pedido);
    return {
      aprobado: true,
      exito: true,
      mensaje: 'Pago aprobado y pedido enviado a logística.',
      transaccionId: idTransaccionInterna,
      descuentoAplicado: descuentoAplicado,
    };
  }
}
