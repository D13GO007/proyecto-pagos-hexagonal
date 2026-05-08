// CAPA: Dominio — Puerto de salida (Outbound Port)
// Define el contrato que el repositorio de cupones debe cumplir.
// El dominio nunca depende de la implementación concreta (adaptador).

import { Cupon } from '../cupon.interface';

export const CUPON_REPOSITORY_PORT = 'ICuponRepositoryPort';

export interface ICuponRepositoryPort {
  buscarPorCodigo(codigo: string): Cupon | undefined;
  listar(): Cupon[];
  guardar(cupon: Cupon): void;
  marcarUsado(codigo: string, clienteEmail: string): void;
}
