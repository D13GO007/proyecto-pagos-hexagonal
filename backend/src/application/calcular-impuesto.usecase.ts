import { calcularIVA } from "../domain/impuesto";

export function calcularTotal(precio: number) {
  const iva = calcularIVA(precio);

  return {
    precio,
    iva,
    total: precio + iva,
  };
}