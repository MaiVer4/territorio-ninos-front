import { EstadoAtraccion, TipoAtraccion } from './enums';

export interface Atraccion {
  id?: number | string;
  nombre: string;
  descripcion?: string;
  tarifaMinuto: number;
  estado?: EstadoAtraccion;
  tipo: TipoAtraccion;
  capacidadMaxima: number;
  duracionMinutosBase: number;
  toleranciaMinutos?: number;
  caidasLimite?: number;
  fechaCreacion?: string;

  // Propiedades opcionales para renderizado visual en componentes UI
  color?: string;
  lightBg?: string;
  tag?: string;
  operarioAsignado?: string;
  ninosActivos?: number;

  // Alias de transición para compatibilidad con código existente
  precio?: number;
  maxCapacity?: number;
  duracion?: number;
}
