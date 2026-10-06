export interface Atraccion {
  id?: number | string;
  nombre: string;
  descripcion?: string;
  tarifaMinuto?: number;
  precio?: number;
  duracion?: number;
  duracionMinutosBase?: number;
  tipo?: string;
  capacidadMaxima?: number;
  maxCapacity?: number;
  edadMin?: number;
  edadMax?: number;
  estado?: string;
  color?: string;
  lightBg?: string;
  tag?: string;
  fechaCreacion?: string;
}
