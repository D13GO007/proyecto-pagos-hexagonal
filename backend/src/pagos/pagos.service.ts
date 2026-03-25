export class ConfirmacionPagoService {
  confirmarPago(idPago: string) {
    return {
      mensaje: "Pago confirmado correctamente",
      id: idPago,
      estado: "aprobado"
    };
  }
}
