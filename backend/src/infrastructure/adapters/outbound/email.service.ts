import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

export interface DatosFacturaMail {
  transaccionId: string;
  pedidoId: string;
  fecha?: string;
  monto: number;
  metodoPago: string;
  emailComprador: string;
  subtotal?: number;
  transporte?: number;
  iva?: number;
  porcentajeIva?: number;
  esAsincrono?: boolean;
}

export interface DatosCambioEstado {
  facturaId: string;
  pedidoId: string;
  nuevoEstado: string;
  monto: number;
  emailComprador: string;
}

export interface SolicitudDevolucionPayload {
  id: string;
  facturaId: string;
  pedidoId: string;
  emailComprador: string;
  tipo: 'ANULACION' | 'DEVOLUCION';
  motivo: string;
  monto?: number;
  descripcion?: string;
}

export interface ResolverSolicitudPayload {
  facturaId: string;
  pedidoId: string;
  emailComprador: string;
  tipo: 'ANULACION' | 'DEVOLUCION';
  decision: 'APROBADA' | 'RECHAZADA';
  motivo: string;
  motivoRechazo?: string;
  monto?: number;
}

export interface EscalarSolicitudPayload {
  solicitudId: string;
  facturaId: string;
  pedidoId: string;
  emailComprador: string;
  tipo: 'ANULACION' | 'DEVOLUCION';
  motivo: string;
  motivoRechazo?: string;
  reclamacion?: string;
  monto?: number;
}

export interface AdminDecisionPayload {
  facturaId: string;
  pedidoId: string;
  emailComprador: string;
  tipo: 'ANULACION' | 'DEVOLUCION';
  decision: 'APROBADA' | 'RECHAZADA';
  adminMotivo?: string;
  monto?: number;
  motivo?: string;
}

const NAVY  = '#1a3a5c';
const BLUE  = '#2563eb';
const WHITE = '#ffffff';
const SLATE = '#334155';
const MUTED = '#64748b';
const BGALT = '#f8fafc';
const BORD  = '#e2e8f0';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // ── Genera PDF como Buffer usando PDFKit ─────────────────────────────────────
  private generarPdfBuffer(f: DatosFacturaMail): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W   = 595.28;
      const M   = 45;
      const col2 = W / 2 + 10;
      let y = 0;

      // Encabezado
      doc.rect(0, 0, W, 95).fill(NAVY);
      doc.rect(0, 95, W, 4).fill(BLUE);

      doc.fillColor(WHITE).fontSize(20).font('Helvetica-Bold')
         .text('FACTURA DE VENTA', 0, 28, { align: 'center', width: W });
      doc.fillColor('#b0cdf0').fontSize(9).font('Helvetica')
         .text('E-COMMERCE  -  Plataforma de Pagos', 0, 56, { align: 'center', width: W })
         .text('NIT: 900.000.000-1   |   Cali, Colombia', 0, 70, { align: 'center', width: W });

      y = 115;

      // Badge estado + número
      const estadoLabel = 'VIGENTE';
      doc.rect(M, y, 56, 16).fill('#16a34a');
      doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
         .text(estadoLabel, M, y + 4, { width: 56, align: 'center' });

      doc.fillColor(MUTED).fontSize(9).font('Helvetica')
         .text(`No. ${f.transaccionId}`, 0, y + 4, { align: 'right', width: W - M });

      y += 26;
      doc.moveTo(M, y).lineTo(W - M, y).stroke(BORD);
      y += 12;

      // Datos del documento
      doc.rect(M, y, W - M * 2, 72).fill(BGALT).stroke(BORD);
      const lx = M + 10;

      doc.fillColor(MUTED).fontSize(7.5).font('Helvetica-Bold');
      doc.text('FECHA DE EMISION',   lx,    y + 10);
      doc.text('PEDIDO',             lx,    y + 42);
      doc.text('METODO DE PAGO',     col2,  y + 10);
      doc.text('ESTADO',             col2,  y + 42);

      const fecha = f.fecha
        ? new Date(f.fecha).toLocaleString('es-CO', { timeZone: 'America/Bogota' })
        : new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

      doc.fillColor(SLATE).fontSize(9).font('Helvetica');
      doc.text(fecha,         lx,    y + 22);
      doc.text(f.pedidoId,   lx,    y + 54);
      doc.text(f.metodoPago, col2,  y + 22);
      doc.text('APROBADO',   col2,  y + 54);

      y += 84;

      // Cabecera tabla
      doc.rect(M, y, W - M * 2, 22).fill(NAVY);
      doc.fillColor(WHITE).fontSize(9).font('Helvetica-Bold')
         .text('CONCEPTO', lx, y + 6)
         .text('VALOR', 0, y + 6, { align: 'right', width: W - M - 4 });
      y += 22;

      const pct = f.porcentajeIva ?? 5;
      const sub = f.subtotal  ?? 0;
      const tra = f.transporte ?? 0;
      const iva = f.iva        ?? 0;

      const filas: [string, number][] = [
        ['Subtotal productos',    sub],
        ['Costo de envio',        tra],
        [`Impuesto IVA (${pct}%)`, iva],
      ];

      filas.forEach(([label, valor], i) => {
        const bg = i % 2 === 0 ? WHITE : BGALT;
        doc.rect(M, y, W - M * 2, 22).fill(bg).stroke(BORD);
        doc.fillColor(SLATE).fontSize(9).font('Helvetica')
           .text(label, lx, y + 6)
           .text(`$${valor.toLocaleString('es-CO')} COP`, 0, y + 6, { align: 'right', width: W - M - 4 });
        y += 22;
      });

      y += 2;

      // Total
      doc.rect(M, y, W - M * 2, 26).fill(NAVY);
      doc.fillColor(WHITE).fontSize(12).font('Helvetica-Bold')
         .text('TOTAL PAGADO', lx, y + 7)
         .text(`$${f.monto.toLocaleString('es-CO')} COP`, 0, y + 7, { align: 'right', width: W - M - 4 });
      y += 38;

      // Correo
      if (f.emailComprador) {
        doc.rect(M, y, W - M * 2, 30).fill('#eff6ff').stroke('#bfdbfe');
        doc.fillColor(BLUE).fontSize(8.5).font('Helvetica-Bold')
           .text('Comprobante enviado por correo electronico a:', lx, y + 7);
        doc.fillColor('#1e40af').fontSize(9).font('Helvetica')
           .text(f.emailComprador, lx, y + 19);
        y += 42;
      }

      // Footer
      doc.rect(0, 780, W, 62).fill(BGALT).stroke(BORD);
      doc.fillColor(MUTED).fontSize(7.5).font('Helvetica')
         .text('Este documento es un comprobante de pago generado automaticamente por el E-Commerce.', 0, 797, { align: 'center', width: W })
         .text('Conserve este documento como soporte de su transaccion.', 0, 810, { align: 'center', width: W });

      doc.end();
    });
  }

  // ── HTML base reutilizable ───────────────────────────────────────────────────
  private htmlTabla(filas: [string, string][]): string {
    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
      <tr style="background:#f1f5f9;">
        <td style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Campo</td>
        <td style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Valor</td>
      </tr>
      ${filas.map(([k, v], i) => `
      <tr style="border-top:1px solid #e2e8f0;${i % 2 !== 0 ? 'background:#f8fafc;' : ''}">
        <td style="padding:12px 16px;font-size:13px;color:#64748b;">${k}</td>
        <td style="padding:12px 16px;font-size:13px;color:#1e293b;font-weight:600;text-align:right;">${v}</td>
      </tr>`).join('')}
    </table>`;
  }

  private wrapHtml(titulo: string, subtitulo: string, cuerpo: string): string {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a3a5c;padding:28px 32px;text-align:center;">
            <p style="margin:0;color:#b0cdf0;font-size:11px;letter-spacing:1px;text-transform:uppercase;">${subtitulo}</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:700;">${titulo}</h1>
          </td>
        </tr>
        <tr><td style="padding:24px 32px;">${cuerpo}</td></tr>
        <tr>
          <td style="background:#f1f5f9;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">Notificacion automatica del E-Commerce. No respondas este mensaje.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }

  // ── Confirmación al comprador (con PDF adjunto) ──────────────────────────────
  async enviarConfirmacionComprador(datos: DatosFacturaMail): Promise<void> {
    const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const esAsync = datos.esAsincrono ?? false;
    const colorEstado = esAsync ? '#d97706' : '#16a34a';
    const labelEstado = esAsync ? 'PENDIENTE DE CONFIRMACION' : 'APROBADO';

    const cuerpo = `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;background:${colorEstado};color:#fff;font-weight:700;font-size:13px;padding:6px 20px;border-radius:20px;">${labelEstado}</span>
      </div>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;">
        ${esAsync
          ? 'Tu solicitud fue registrada. El pago quedara confirmado cuando completes el proceso en el portal de tu banco o punto de pago.'
          : 'Tu pago fue procesado exitosamente. Encuentra tu factura adjunta en este correo.'}
      </p>
      ${this.htmlTabla([
        ['ID Transaccion',  datos.transaccionId],
        ['Pedido',          datos.pedidoId],
        ['Metodo de pago',  datos.metodoPago],
        ['Subtotal',        `$${(datos.subtotal ?? 0).toLocaleString('es-CO')} COP`],
        ['Transporte',      `$${(datos.transporte ?? 0).toLocaleString('es-CO')} COP`],
        [`IVA (${datos.porcentajeIva ?? 5}%)`, `$${(datos.iva ?? 0).toLocaleString('es-CO')} COP`],
        ['Fecha',           fecha],
      ])}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:2px;border-radius:0 0 6px 6px;overflow:hidden;">
        <tr style="background:#1a3a5c;">
          <td style="padding:14px 16px;font-size:14px;color:#fff;font-weight:700;">Total pagado</td>
          <td style="padding:14px 16px;font-size:16px;color:#fff;font-weight:700;text-align:right;">$${datos.monto.toLocaleString('es-CO')} COP</td>
        </tr>
      </table>
      ${!esAsync ? '<p style="margin:16px 0 0;color:#64748b;font-size:13px;">Tu factura en PDF esta adjunta a este correo.</p>' : ''}`;

    try {
      const attachments: nodemailer.SendMailOptions['attachments'] = [];
      if (!esAsync) {
        const pdfBuffer = await this.generarPdfBuffer(datos);
        attachments.push({
          filename: `Factura-${datos.transaccionId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });
      }

      await this.transporter.sendMail({
        from: `"E-Commerce" <${process.env.EMAIL_USER}>`,
        to: datos.emailComprador,
        subject: esAsync
          ? `[E-Commerce] Solicitud registrada - ${datos.transaccionId}`
          : `[E-Commerce] Pago aprobado - ${datos.transaccionId}`,
        html: this.wrapHtml('Comprobante de Pago', 'E-Commerce', cuerpo),
        attachments,
      });
      this.logger.log(`Correo + PDF enviado al comprador: ${datos.emailComprador}`);
    } catch (err: any) {
      this.logger.error(`Error al enviar correo al comprador: ${err.message}`);
    }
  }

  // ── Notificación al vendedor (pago nuevo) ────────────────────────────────────
  async enviarNotificacionVendedor(datos: DatosFacturaMail): Promise<void> {
    const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const esAsync = datos.esAsincrono ?? false;
    const colorEstado = esAsync ? '#d97706' : '#16a34a';
    const labelEstado = esAsync ? 'PENDIENTE' : 'APROBADO';

    const cuerpo = `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;background:${colorEstado};color:#fff;font-weight:700;font-size:13px;padding:6px 20px;border-radius:20px;">${labelEstado}</span>
      </div>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;">Se ha registrado un nuevo pago en el sistema.</p>
      ${this.htmlTabla([
        ['ID Transaccion', datos.transaccionId],
        ['Pedido',         datos.pedidoId],
        ['Comprador',      datos.emailComprador],
        ['Metodo',         datos.metodoPago],
        ['Fecha',          fecha],
      ])}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:2px;border-radius:0 0 6px 6px;overflow:hidden;">
        <tr style="background:#1a3a5c;">
          <td style="padding:14px 16px;font-size:14px;color:#fff;font-weight:700;">Monto recibido</td>
          <td style="padding:14px 16px;font-size:16px;color:#fff;font-weight:700;text-align:right;">$${datos.monto.toLocaleString('es-CO')} COP</td>
        </tr>
      </table>
      <p style="margin:16px 0 0;color:#64748b;font-size:13px;">Revisa el historial completo en: <strong>localhost:3000/vendedor/historial</strong></p>`;

    try {
      await this.transporter.sendMail({
        from: `"E-Commerce" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_VENDEDOR,
        subject: `[E-Commerce] Nuevo pago ${labelEstado} - Pedido ${datos.pedidoId}`,
        html: this.wrapHtml('Nuevo Pago Recibido', 'Panel del Vendedor - E-Commerce', cuerpo),
      });
      this.logger.log(`Correo enviado al vendedor: ${process.env.EMAIL_VENDEDOR}`);
    } catch (err: any) {
      this.logger.error(`Error al enviar correo al vendedor: ${err.message}`);
    }
  }

  // ── Nueva solicitud de devolución → notificar vendedor ──────────────────────
  async enviarSolicitudVendedor(s: SolicitudDevolucionPayload): Promise<void> {
    const tipoLabel = s.tipo === 'ANULACION' ? 'Anulacion' : 'Devolucion';
    const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

    const cuerpo = `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;background:#d97706;color:#fff;font-weight:700;font-size:13px;padding:6px 20px;border-radius:20px;">PENDIENTE DE REVISION</span>
      </div>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;">
        Un cliente ha solicitado una <strong>${tipoLabel}</strong>. Revisa los detalles y responde en el panel de devoluciones.
      </p>
      ${this.htmlTabla([
        ['ID Solicitud',   s.id],
        ['Factura',        s.facturaId],
        ['Pedido',         s.pedidoId],
        ['Cliente',        s.emailComprador],
        ['Tipo',           tipoLabel],
        ['Motivo',         s.motivo],
        ['Fecha',          fecha],
      ])}
      ${s.descripcion ? `<p style="margin:12px 0 0;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;color:#334155;"><strong>Descripcion adicional:</strong> ${s.descripcion}</p>` : ''}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:2px;border-radius:0 0 6px 6px;overflow:hidden;">
        <tr style="background:#1a3a5c;">
          <td style="padding:14px 16px;font-size:14px;color:#fff;font-weight:700;">Monto afectado</td>
          <td style="padding:14px 16px;font-size:16px;color:#fff;font-weight:700;text-align:right;">$${(s.monto || 0).toLocaleString('es-CO')} COP</td>
        </tr>
      </table>
      <p style="margin:16px 0 0;color:#64748b;font-size:13px;">Gestiona esta solicitud en: <strong>localhost:3000/vendedor/devoluciones</strong></p>`;

    try {
      await this.transporter.sendMail({
        from: `"E-Commerce" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_VENDEDOR,
        subject: `[E-Commerce] Nueva solicitud de ${tipoLabel} - ${s.pedidoId}`,
        html: this.wrapHtml(`Nueva Solicitud de ${tipoLabel}`, 'Panel del Vendedor - E-Commerce', cuerpo),
      });
      this.logger.log(`Solicitud de devolucion notificada al vendedor`);
    } catch (err: any) {
      this.logger.error(`Error notificando solicitud: ${err.message}`);
    }
  }

  // ── Resolución (aprobada/rechazada) → notificar cliente ──────────────────────
  async enviarResolucionCliente(r: ResolverSolicitudPayload): Promise<void> {
    const aprobada   = r.decision === 'APROBADA';
    const tipoLabel  = r.tipo === 'ANULACION' ? 'anulacion' : 'devolucion';
    const colorBadge = aprobada ? '#16a34a' : '#dc2626';
    const fecha      = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

    const cuerpo = `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;background:${colorBadge};color:#fff;font-weight:700;font-size:13px;padding:6px 20px;border-radius:20px;">${r.decision}</span>
      </div>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;">
        ${aprobada
          ? `Tu solicitud de <strong>${tipoLabel}</strong> ha sido <strong>aprobada</strong>. El proceso de ${r.tipo === 'ANULACION' ? 'cancelacion del pedido' : 'reembolso'} ha sido iniciado.`
          : `Tu solicitud de <strong>${tipoLabel}</strong> ha sido <strong>rechazada</strong> por el vendedor.`
        }
      </p>
      ${this.htmlTabla([
        ['Factura',   r.facturaId],
        ['Pedido',    r.pedidoId],
        ['Tipo',      r.tipo === 'ANULACION' ? 'Anulacion' : 'Devolucion'],
        ['Tu motivo', r.motivo],
        ['Decision',  r.decision],
        ['Fecha',     fecha],
      ])}
      ${!aprobada && r.motivoRechazo ? `
        <div style="margin-top:12px;padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;">
          <p style="margin:0;font-size:13px;color:#991b1b;"><strong>Motivo del rechazo:</strong> ${r.motivoRechazo}</p>
        </div>` : ''}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-radius:6px;overflow:hidden;">
        <tr style="background:#1a3a5c;">
          <td style="padding:14px 16px;font-size:14px;color:#fff;font-weight:700;">Monto ${aprobada ? 'a reembolsar' : 'afectado'}</td>
          <td style="padding:14px 16px;font-size:16px;color:#fff;font-weight:700;text-align:right;">$${(r.monto || 0).toLocaleString('es-CO')} COP</td>
        </tr>
      </table>
      ${!aprobada ? '<p style="margin:16px 0 0;color:#64748b;font-size:13px;">Si tienes dudas, puedes contactar directamente al vendedor.</p>' : ''}`;

    try {
      await this.transporter.sendMail({
        from: `"E-Commerce" <${process.env.EMAIL_USER}>`,
        to: r.emailComprador,
        subject: `[E-Commerce] Tu solicitud fue ${r.decision} - ${r.facturaId}`,
        html: this.wrapHtml(
          `Solicitud ${r.decision}`,
          'Respuesta a tu Solicitud de Devolucion',
          cuerpo,
        ),
      });
      this.logger.log(`Resolucion enviada al cliente: ${r.emailComprador}`);
    } catch (err: any) {
      this.logger.error(`Error enviando resolucion: ${err.message}`);
    }
  }

  // ── Reclamacion escalada al admin ───────────────────────────────────────────
  async enviarEscalacionAdmin(r: EscalarSolicitudPayload): Promise<void> {
    const tipoLabel = r.tipo === 'ANULACION' ? 'Anulacion' : 'Devolucion';
    const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

    const cuerpo = `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;background:#7c3aed;color:#fff;font-weight:700;font-size:13px;padding:6px 20px;border-radius:20px;">RECLAMACION ESCALADA</span>
      </div>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;">
        Un comprador no esta de acuerdo con el rechazo del vendedor y ha escalado la solicitud para revision de administrador.
      </p>
      ${this.htmlTabla([
        ['ID Solicitud',   r.solicitudId],
        ['Factura',        r.facturaId],
        ['Pedido',         r.pedidoId],
        ['Comprador',      r.emailComprador],
        ['Tipo',           tipoLabel],
        ['Motivo original', r.motivo],
        ['Fecha',          fecha],
      ])}
      <div style="margin-top:12px;padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;">Razon de rechazo del vendedor</p>
        <p style="margin:0;font-size:13px;color:#7f1d1d;">${r.motivoRechazo || '—'}</p>
      </div>
      <div style="margin-top:8px;padding:12px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:6px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#5b21b6;text-transform:uppercase;">Argumento del comprador</p>
        <p style="margin:0;font-size:13px;color:#4c1d95;">${r.reclamacion || '—'}</p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-radius:6px;overflow:hidden;">
        <tr style="background:#1a3a5c;">
          <td style="padding:14px 16px;font-size:14px;color:#fff;font-weight:700;">Monto en disputa</td>
          <td style="padding:14px 16px;font-size:16px;color:#fff;font-weight:700;text-align:right;">$${(r.monto || 0).toLocaleString('es-CO')} COP</td>
        </tr>
      </table>
      <p style="margin:16px 0 0;color:#64748b;font-size:13px;">Revisa y decide en: <strong>localhost:3000/admin/reclamaciones</strong></p>`;

    try {
      await this.transporter.sendMail({
        from: `"E-Commerce" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_VENDEDOR,
        subject: `[E-Commerce] RECLAMACION ESCALADA - ${r.pedidoId}`,
        html: this.wrapHtml('Reclamacion Escalada al Administrador', 'Panel de Mediacion - E-Commerce', cuerpo),
      });
      this.logger.log(`Reclamacion escalada notificada al admin`);
    } catch (err: any) {
      this.logger.error(`Error notificando escalacion: ${err.message}`);
    }
  }

  // ── Decision final del admin → notificar a comprador y vendedor ─────────────
  async enviarDecisionAdmin(r: AdminDecisionPayload): Promise<void> {
    const aprobada  = r.decision === 'APROBADA';
    const tipoLabel = r.tipo === 'ANULACION' ? 'anulacion' : 'devolucion';
    const color     = aprobada ? '#16a34a' : '#dc2626';
    const fecha     = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const label     = aprobada ? 'APROBADA POR ADMINISTRADOR' : 'RECHAZO MANTENIDO POR ADMINISTRADOR';

    const tablaBase = this.htmlTabla([
      ['Factura',  r.facturaId],
      ['Pedido',   r.pedidoId],
      ['Tipo',     r.tipo === 'ANULACION' ? 'Anulacion' : 'Devolucion'],
      ['Decision', label],
      ['Fecha',    fecha],
    ]);

    const bloqueDecision = `
      <div style="margin-top:12px;padding:14px;background:${aprobada ? '#f0fdf4' : '#fef2f2'};border:1px solid ${aprobada ? '#bbf7d0' : '#fecaca'};border-radius:6px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${aprobada ? '#15803d' : '#991b1b'};text-transform:uppercase;">Justificacion del administrador</p>
        <p style="margin:0;font-size:13px;color:${aprobada ? '#14532d' : '#7f1d1d'};">${r.adminMotivo || '—'}</p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-radius:6px;overflow:hidden;">
        <tr style="background:#1a3a5c;">
          <td style="padding:14px 16px;font-size:14px;color:#fff;font-weight:700;">Monto ${aprobada ? 'a reembolsar' : 'en disputa'}</td>
          <td style="padding:14px 16px;font-size:16px;color:#fff;font-weight:700;text-align:right;">$${(r.monto || 0).toLocaleString('es-CO')} COP</td>
        </tr>
      </table>`;

    // Email al comprador
    const cuerpoComprador = `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;background:${color};color:#fff;font-weight:700;font-size:13px;padding:6px 20px;border-radius:20px;">${label}</span>
      </div>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;">
        ${aprobada
          ? `El administrador ha revisado tu reclamacion y ha decidido <strong>aprobar</strong> tu solicitud de ${tipoLabel}. El proceso de ${r.tipo === 'ANULACION' ? 'cancelacion' : 'reembolso'} ha sido iniciado.`
          : `El administrador ha revisado tu reclamacion y ha decidido <strong>mantener el rechazo</strong> del vendedor. Esta decision es definitiva.`
        }
      </p>
      ${tablaBase}${bloqueDecision}`;

    // Email al vendedor
    const cuerpoVendedor = `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;background:${color};color:#fff;font-weight:700;font-size:13px;padding:6px 20px;border-radius:20px;">${label}</span>
      </div>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;">
        ${aprobada
          ? `El administrador ha revisado una reclamacion escalada y ha decidido <strong>aprobar</strong> la solicitud del comprador (${r.emailComprador}).`
          : `El administrador ha revisado una reclamacion escalada y ha decidido <strong>mantener tu rechazo</strong> en la solicitud del comprador (${r.emailComprador}).`
        }
      </p>
      ${tablaBase}${bloqueDecision}`;

    try {
      await Promise.all([
        this.transporter.sendMail({
          from: `"E-Commerce" <${process.env.EMAIL_USER}>`,
          to: r.emailComprador,
          subject: `[E-Commerce] Decision del Administrador - ${r.facturaId}`,
          html: this.wrapHtml('Decision Final del Administrador', 'Mediacion - E-Commerce', cuerpoComprador),
        }),
        this.transporter.sendMail({
          from: `"E-Commerce" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_VENDEDOR,
          subject: `[E-Commerce] Decision del Administrador - ${r.pedidoId}`,
          html: this.wrapHtml('Decision Final del Administrador', 'Mediacion - E-Commerce', cuerpoVendedor),
        }),
      ]);
      this.logger.log(`Decision del admin notificada a comprador y vendedor`);
    } catch (err: any) {
      this.logger.error(`Error enviando decision del admin: ${err.message}`);
    }
  }

  // ── Notificación al vendedor (cambio de estado de factura) ───────────────────
  async enviarCambioEstadoVendedor(datos: DatosCambioEstado): Promise<void> {
    const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const colorEstado =
      datos.nuevoEstado === 'ANULADA'     ? '#dc2626' :
      datos.nuevoEstado === 'REEMBOLSADA' ? '#7c3aed' : '#64748b';

    const cuerpo = `
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;background:${colorEstado};color:#fff;font-weight:700;font-size:13px;padding:6px 20px;border-radius:20px;">${datos.nuevoEstado}</span>
      </div>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;">
        El cliente ha solicitado un cambio de estado en su factura.
      </p>
      ${this.htmlTabla([
        ['Factura ID',     datos.facturaId],
        ['Pedido',         datos.pedidoId],
        ['Nuevo estado',   datos.nuevoEstado],
        ['Comprador',      datos.emailComprador],
        ['Monto afectado', `$${datos.monto.toLocaleString('es-CO')} COP`],
        ['Fecha',          fecha],
      ])}
      <p style="margin:16px 0 0;color:#64748b;font-size:13px;">Accede al panel para gestionar esta solicitud: <strong>localhost:3000/vendedor/historial</strong></p>`;

    try {
      await this.transporter.sendMail({
        from: `"E-Commerce" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_VENDEDOR,
        subject: `[E-Commerce] Factura ${datos.nuevoEstado} - ${datos.facturaId}`,
        html: this.wrapHtml(
          `Factura ${datos.nuevoEstado}`,
          'Notificacion de Cambio de Estado',
          cuerpo,
        ),
      });
      this.logger.log(`Notificacion de cambio de estado enviada al vendedor`);
    } catch (err: any) {
      this.logger.error(`Error al notificar cambio de estado: ${err.message}`);
    }
  }
}
