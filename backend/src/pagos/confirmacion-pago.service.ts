export class ConfirmacionPagoService {
  confirmarPago(id: string) {
    return {
      mensaje: "Pago confirmado",
      id: id,
      estado: "aprobado"
    };
  }
}
