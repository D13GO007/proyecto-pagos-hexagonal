// CAPA: Dominio — Servicio de dominio puro (Domain Service)
// Calcula el porcentaje de impuesto según el tipo de producto (19%, 5%, 0%).
// No depende de ningún framework, base de datos ni servicio externo.

export enum TipoProducto {
  GENERAL = 'GENERAL',
  REDUCIDO = 'REDUCIDO',
  EXENTO = 'EXENTO',
}

export class CalculadorTasas {
  private static readonly TASAS: Record<TipoProducto, number> = {
    [TipoProducto.GENERAL]: 19,
    [TipoProducto.REDUCIDO]: 5,
    [TipoProducto.EXENTO]: 0,
  };

  public static obtenerPorcentaje(tipo: TipoProducto): number {
    const tasa = this.TASAS[tipo];
    if (tasa === undefined) {
      throw new Error('Tipo de producto no reconocido');
    }
    return tasa;
  }
}
