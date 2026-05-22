// CAPA: Dominio — Servicio de dominio puro (Domain Service)
// Anti-fraude: valida que totalCobrado === subtotal + IVA + envío (tolerancia ±0.01 por redondeo).

export class ValidadorImpuestos {
  public static validarCobroExacto(
    subtotal: number,
    porcentajeImpuesto: number,
    costoEnvio: number,
    totalCobrado: number,
  ): void {
    const impuestoCalculado = subtotal * (porcentajeImpuesto / 100);
    const totalEsperado = subtotal + impuestoCalculado + costoEnvio;

    if (Math.abs(totalCobrado - totalEsperado) > 0.01) {
      throw new Error(
        `Monto incorrecto: se esperaba $${totalEsperado}, se recibió $${totalCobrado}.`,
      );
    }
  }
}