export class PagosService {
  calcularTotal(precio: number, pais: string) {
    let iva = 0;

    if (pais === "CO") {
      iva = precio * 0.19;
    }

    const total = precio + iva;

    return {
      precioBase: precio,
      iva: iva,
      total: total
    };
  }
}
