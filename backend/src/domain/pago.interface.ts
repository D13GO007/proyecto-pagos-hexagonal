// backend/src/domain/pago.interface.ts
export class DatosPago {
  metodo: string;
  monto: number;
  detalles: any; 
  guardarMetodo?: boolean; // Le decimos que es opcional con el "?"
}