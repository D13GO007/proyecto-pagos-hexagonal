export type EstadoTransaccion = 'APROBADO' | 'PENDIENTE' | 'RECHAZADO';

export interface Transaccion {
  id: string;
  pedidoId: string;
  fecha: string;
  monto: number;
  metodoPago: string;
  estado: EstadoTransaccion;
  clienteEmail?: string;
  motivoRechazo?: string;
}

export interface Factura extends Transaccion {
  estadoFactura: 'VIGENTE' | 'ANULADA' | 'REEMBOLSADA';
  subtotal: number;
  transporte: number;
  iva: number;
  porcentajeIva?: number;
  ciudad?: string;
  tipoImpuesto?: string;
}

export type EstadoSolicitud =
  | 'PENDIENTE'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'RECLAMADA'
  | 'RESUELTA_ADMIN';

export interface SolicitudDevolucion {
  id: string;
  facturaId: string;
  pedidoId: string;
  emailComprador: string;
  monto: number;
  tipo: 'ANULACION' | 'DEVOLUCION';
  motivo: string;
  descripcion: string;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  // Resolución del vendedor
  motivoRechazo?: string;
  detalleRechazo?: string;
  fechaResolucion?: string;
  // Escalación del comprador
  reclamacion?: string;
  fechaReclamacion?: string;
  // Decisión final del administrador
  adminDecision?: 'APROBADA' | 'RECHAZADA';
  adminMotivo?: string;
  fechaAdminResolucion?: string;
  // ID único de reembolso generado al aprobar una DEVOLUCION (HU19)
  reembolsoId?: string;
}

const KEY_TRANSACCIONES = 'historial_transacciones';
const KEY_FACTURAS      = 'mis_facturas';
const KEY_SOLICITUDES   = 'solicitudes_devolucion';

export function guardarTransaccion(t: Transaccion): void {
  const lista = obtenerTransacciones();
  lista.unshift(t);
  localStorage.setItem(KEY_TRANSACCIONES, JSON.stringify(lista));
}

export function obtenerTransacciones(): Transaccion[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY_TRANSACCIONES) || '[]');
  } catch { return []; }
}

export function guardarFactura(f: Factura): void {
  const lista = obtenerFacturas();
  const idx = lista.findIndex((x) => x.id === f.id);
  if (idx >= 0) lista[idx] = f;
  else lista.unshift(f);
  localStorage.setItem(KEY_FACTURAS, JSON.stringify(lista));
}

export function obtenerFacturas(): Factura[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY_FACTURAS) || '[]');
  } catch { return []; }
}

export function actualizarEstadoFactura(
  id: string,
  estadoFactura: Factura['estadoFactura'],
): void {
  const lista = obtenerFacturas();
  const f = lista.find((x) => x.id === id);
  if (f) {
    f.estadoFactura = estadoFactura;
    localStorage.setItem(KEY_FACTURAS, JSON.stringify(lista));
  }
}

export function guardarSolicitud(s: SolicitudDevolucion): void {
  const lista = obtenerSolicitudes();
  const idx = lista.findIndex((x) => x.id === s.id);
  if (idx >= 0) lista[idx] = s;
  else lista.unshift(s);
  localStorage.setItem(KEY_SOLICITUDES, JSON.stringify(lista));
}

export function obtenerSolicitudes(): SolicitudDevolucion[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY_SOLICITUDES) || '[]');
  } catch { return []; }
}

export function obtenerSolicitudPorFactura(facturaId: string): SolicitudDevolucion | undefined {
  return obtenerSolicitudes().find((s) => s.facturaId === facturaId);
}

export function actualizarSolicitud(id: string, cambios: Partial<SolicitudDevolucion>): void {
  const lista = obtenerSolicitudes();
  const s = lista.find((x) => x.id === id);
  if (s) {
    Object.assign(s, cambios);
    localStorage.setItem(KEY_SOLICITUDES, JSON.stringify(lista));
  }
}
