// CAPA: Dominio — Servicio de dominio puro (Domain Service)
// Determina el costo de envío según la ciudad del destinatario.
// Toda la lógica de tarificación vive aquí, sin dependencias externas.

export class CalculadorEnvio {
  // Criterio 1: Transporte según ubicación
  public static obtenerTarifa(ciudad: string): number {
    const tarifas: Record<string, number> = {
      Cali: 0,
      Bogota: 15000,
      Medellin: 12000,
    };

    // Si la ciudad no está en la lista, cobramos tarifa nacional
    return tarifas[ciudad] !== undefined ? tarifas[ciudad] : 20000;
  }
}
