import { EstadoAtraccion, TipoAtraccion } from './enums';
import { Menor } from './cliente.model';

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
  imagenUrl?: string;

  // Alias de transición para compatibilidad con código existente
  precio?: number;
  maxCapacity?: number;
  duracion?: number;
}

export interface ModalidadSeleccionada {
  tipo: TipoAtraccion;
  etiqueta: string; // Ej: '15 min', '30 min', '60 min', '3 caídas'
  valor: number;    // Minutos (15, 30, 60) o número de caídas (3, 5)
  precio: number;   // Precio calculado o de tarifa en COP
}

export interface SeleccionCatalogoPOS {
  atraccion: Atraccion;
  modalidad: ModalidadSeleccionada;
  cantidad?: number;
  menorAsignado?: Menor | null;
}

export type CartItemPOS = SeleccionCatalogoPOS;
