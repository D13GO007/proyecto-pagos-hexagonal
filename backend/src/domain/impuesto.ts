export function calcularIVA(precio: number): number {
  return precio * 0.19; 
}

export function calcularImpuestoServicio(precio: number): number {
  return precio * 0.05; // 5% extra (ejemplo)
}

export function calcularEnvio(ubicacion: string): number {
  switch (ubicacion) {
    case 'local':
      return 5000;
    case 'nacional':
      return 10000;
    case 'internacional':
      return 25000;
    default:
      return 8000;
  }
}