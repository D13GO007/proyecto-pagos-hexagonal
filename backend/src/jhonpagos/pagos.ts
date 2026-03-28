export function validarMontoConImpuesto(montoBase: number, total: number) {
  const IVA = 0.19;

  const impuesto = montoBase * IVA;
  const totalEsperado = montoBase + impuesto;

  const esperado = Number(totalEsperado.toFixed(2));
  const recibido = Number(total.toFixed(2));

  if (recibido !== esperado) {
    return {
      valido: false,
      mensaje: 'El monto no incluye correctamente los impuestos',
      esperado: esperado,
      recibido: recibido,
    };
  }

  return {
    valido: true,
    mensaje: 'El monto es correcto',
    total: esperado,
  };
}