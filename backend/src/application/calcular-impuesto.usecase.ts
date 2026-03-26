// calcular-impuesto.usecase.ts

export function calcularTotal(precio: number, ubicacion: string) {
  const IVA_RATE = 0.19;

  const iva = precio * IVA_RATE;

  // Transporte según ubicación
  let envio = 0;
  if (ubicacion === "cali") envio = 10000;
  else if (ubicacion === "bogota") envio = 15000;
  else envio = 20000;

  const total = precio + iva + envio;

  return {
    precio,
    iva,
    envio,
    total,
  };
}