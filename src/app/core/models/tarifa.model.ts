export interface TarifaBloque {
  id?: number | string;
  atraccionId: number | string;
  minutos: number; // 15, 30, 60, etc.
  precio: number;  // Valor en COP > 0
  vigente?: boolean;
}

export interface TarifaEvento {
  id?: number | string;
  atraccionId: number | string;
  intentos: number; // Mínimo 1 caída/intento
  precio: number;   // Valor en COP > 0
  descripcion?: string;
  vigente?: boolean;
}

export interface TarifarioAtraccion {
  atraccionId: number | string;
  nombreAtraccion: string;
  tipo: 'TEMPORIZADA' | 'EVENTOS_CAIDAS';
  bloques: TarifaBloque[];
  eventos: TarifaEvento[];
}
