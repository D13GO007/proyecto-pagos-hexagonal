// CAPA: Dominio — Entidad Cupón (Domain Entity)
// Representa un cupón de descuento creado por el vendedor.
// Sin dependencias de framework: es el núcleo puro del negocio.

export interface Cupon {
  codigo: string;
  descripcion: string;
  tipoDescuento: 'porcentaje' | 'monto';
  valorDescuento: number;   // % o COP según tipoDescuento
  montoMinimo: number;      // HU15: monto mínimo de compra para aplicar
  maxUsos: number;          // HU13: límite total de usos
  usosActuales: number;
  clientesQueUsaron: string[]; // HU15: un uso por cliente (por email)
  fechaExpiracion: string;     // ISO 8601
  activo: boolean;
  vendedorId: string;
  creadoEn: string;
}
