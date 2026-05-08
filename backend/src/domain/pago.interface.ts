// CAPA: Dominio — Entidad / Modelo de datos (Domain Entity)
// Representa los datos de pago que el usuario envía al sistema.
// Es una estructura de datos del núcleo del dominio, sin lógica de framework.
export class DatosPago {
  metodo: string;
  monto: number;
  detalles: any; 
  guardarMetodo?: boolean; // Le decimos que es opcional con el "?"
}