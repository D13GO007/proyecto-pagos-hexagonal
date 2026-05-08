import jsPDF from 'jspdf';
import type { Factura } from './transacciones';

const NAVY: [number, number, number]  = [26, 58, 92];
const BLUE: [number, number, number]  = [37, 99, 235];
const SLATE: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];
const BGALT: [number, number, number] = [248, 250, 252];
const BORDER: [number, number, number]= [226, 232, 240];
const WHITE: [number, number, number] = [255, 255, 255];

export function generarFacturaPDF(f: Factura): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 16;
  let y = 0;

  // ── ENCABEZADO ──────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 42, 'F');

  // Línea de acento azul
  doc.setFillColor(...BLUE);
  doc.rect(0, 42, W, 2.5, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA DE VENTA', W / 2, 15, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(176, 204, 240);
  doc.text('E-COMMERCE  -  Plataforma de Pagos', W / 2, 23, { align: 'center' });
  doc.text('NIT: 900.000.000-1   |   Colombia', W / 2, 30, { align: 'center' });

  y = 54;

  // ── BADGE + NUMERO ───────────────────────────────────────────────────────────
  const badge: [number, number, number] =
    f.estadoFactura === 'VIGENTE'     ? [22, 163, 74]  :
    f.estadoFactura === 'ANULADA'     ? [220, 38, 38]  : [124, 58, 237];

  doc.setFillColor(...badge);
  doc.roundedRect(M, y - 7.5, 30, 8, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(f.estadoFactura, M + 15, y - 2.5, { align: 'center' });

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`No. ${f.id}`, W - M, y - 2.5, { align: 'right' });
  y += 6;

  doc.setDrawColor(...BORDER);
  doc.line(M, y, W - M, y);
  y += 8;

  // ── DATOS DEL DOCUMENTO ─────────────────────────────────────────────────────
  doc.setFillColor(...BGALT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(M, y, W - M * 2, 32, 2, 2, 'FD');

  const c1 = M + 6;
  const c2 = W / 2 + 6;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MUTED);
  doc.text('FECHA DE EMISION', c1, y + 8);
  doc.text('PEDIDO', c1, y + 22);
  doc.text('METODO DE PAGO', c2, y + 8);
  doc.text('ESTADO TRANSACCION', c2, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE);
  doc.setFontSize(9);
  doc.text(new Date(f.fecha).toLocaleString('es-CO'), c1, y + 14);
  doc.text(f.pedidoId, c1, y + 28);
  doc.text(f.metodoPago, c2, y + 14);
  doc.text(f.estado, c2, y + 28);
  y += 40;

  // ── TABLA DE CONCEPTOS ───────────────────────────────────────────────────────
  // Cabecera
  doc.setFillColor(...NAVY);
  doc.roundedRect(M, y, W - M * 2, 9, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCEPTO', c1, y + 6);
  doc.text('VALOR', W - M - 4, y + 6, { align: 'right' });
  y += 9;

  const pctIva = f.porcentajeIva ?? (f.subtotal > 0 ? Math.round((f.iva / f.subtotal) * 100) : 5);
  const filas: [string, number][] = [
    ['Subtotal productos', f.subtotal],
    ['Costo de envio / Transporte', f.transporte],
    [`Impuesto IVA (${pctIva}%)`, f.iva],
  ];

  filas.forEach(([label, valor], i) => {
    const bg: [number, number, number] = i % 2 === 0 ? WHITE : BGALT;
    doc.setFillColor(...bg);
    doc.setDrawColor(...BORDER);
    doc.rect(M, y, W - M * 2, 9, 'FD');
    doc.setTextColor(...SLATE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(label, c1, y + 6);
    doc.text(`$${valor.toLocaleString('es-CO')} COP`, W - M - 4, y + 6, { align: 'right' });
    y += 9;
  });

  y += 2;

  // Fila TOTAL
  doc.setFillColor(...NAVY);
  doc.roundedRect(M, y, W - M * 2, 13, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL PAGADO', c1, y + 9);
  doc.text(`$${f.monto.toLocaleString('es-CO')} COP`, W - M - 4, y + 9, { align: 'right' });
  y += 22;

  // ── NOTIFICACION DE CORREO ───────────────────────────────────────────────────
  if (f.clienteEmail) {
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(M, y, W - M * 2, 16, 2, 2, 'FD');
    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Comprobante enviado por correo electronico a:', c1, y + 6.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 64, 175);
    doc.text(f.clienteEmail, c1, y + 12.5);
    y += 24;
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  doc.setFillColor(...BGALT);
  doc.setDrawColor(...BORDER);
  doc.rect(0, 277, W, 20, 'FD');
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    'Este documento es un comprobante de pago generado automaticamente por E-Commerce.',
    W / 2, 285, { align: 'center' }
  );
  doc.text(
    'Conserve este documento como soporte de su transaccion.',
    W / 2, 291, { align: 'center' }
  );

  doc.save(`Factura-${f.id}.pdf`);
}

export function generarNotaCreditoPDF(
  facturaId: string,
  reembolsoId: string,
  monto: number,
  motivo: string,
  emailComprador: string,
  tipo: 'ANULACION' | 'DEVOLUCION',
  fecha: string,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 16;

  const ROSE:    [number, number, number] = [190, 18, 60];
  const ROSEBG:  [number, number, number] = [255, 241, 242];
  const ROSEBRD: [number, number, number] = [254, 205, 211];

  // Encabezado
  doc.setFillColor(...ROSE);
  doc.rect(0, 0, W, 42, 'F');
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 42, W, 2.5, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA DE CRÉDITO', W / 2, 15, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(254, 202, 202);
  doc.text('E-COMMERCE  -  Plataforma de Pagos', W / 2, 23, { align: 'center' });
  doc.text(`Tipo: ${tipo === 'ANULACION' ? 'Anulación de compra' : 'Devolución de producto'}`, W / 2, 30, { align: 'center' });

  let y = 54;

  // IDs de referencia
  doc.setFillColor(...BGALT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(M, y, W - M * 2, 32, 2, 2, 'FD');

  const c1 = M + 6;
  const c2 = W / 2 + 6;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MUTED);
  doc.text('ID NOTA DE CRÉDITO', c1, y + 8);
  doc.text('FACTURA ORIGINAL', c1, y + 22);
  doc.text('FECHA', c2, y + 8);
  doc.text('CLIENTE', c2, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE);
  doc.setFontSize(9);
  doc.text(reembolsoId, c1, y + 14);
  doc.text(facturaId, c1, y + 28);
  doc.text(new Date(fecha).toLocaleString('es-CO'), c2, y + 14);
  doc.text(emailComprador, c2, y + 28);
  y += 42;

  // Motivo
  doc.setFillColor(...ROSEBG);
  doc.setDrawColor(...ROSEBRD);
  doc.roundedRect(M, y, W - M * 2, 22, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ROSE);
  doc.text('MOTIVO DE LA NOTA DE CRÉDITO', c1, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE);
  doc.setFontSize(9);
  const motivoLines = doc.splitTextToSize(motivo, W - M * 2 - 12);
  doc.text(motivoLines[0] || motivo, c1, y + 16);
  y += 32;

  // Monto acreditado
  doc.setFillColor(...ROSE);
  doc.roundedRect(M, y, W - M * 2, 16, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('VALOR ACREDITADO', c1, y + 11);
  doc.text(`$${monto.toLocaleString('es-CO')} COP`, W - M - 4, y + 11, { align: 'right' });
  y += 26;

  // Nota legal
  doc.setFillColor(...BGALT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(M, y, W - M * 2, 20, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Este documento acredita la anulación o reembolso de la transacción referenciada.', c1, y + 8);
  doc.text('El valor será devuelto al método de pago original en un plazo de 3 a 5 días hábiles.', c1, y + 15);

  // Footer
  doc.setFillColor(...BGALT);
  doc.setDrawColor(...BORDER);
  doc.rect(0, 277, W, 20, 'FD');
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Nota de Crédito generada automaticamente por E-Commerce. Conserve este documento.', W / 2, 285, { align: 'center' });
  doc.text(`Referencia: ${reembolsoId}  |  Factura original: ${facturaId}`, W / 2, 291, { align: 'center' });

  doc.save(`NotaCredito-${reembolsoId}.pdf`);
}
