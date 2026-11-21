export interface TarifaTiempoItem {
  id: number;
  duracionMinutos: number;
  precio: number;
  descripcion?: string;
}

export interface TarifaEventoItem {
  id: number;
  intentos: number;
  precio: number;
  descripcion?: string;
}

export interface CatalogoAtraccionOnline {
  id: number;
  nombre: string;
  descripcion: string;
  tipoAtraccion: 'TEMPORIZADA' | 'EVENTOS_CAIDAS' | string;
  cuposLibres: number;
  capacidadMaxima: number;
  edadMinima: number;
  edadMaxima: number;
  tarifaMinuto?: number | null;
  duracionRecomendadaMinutos?: number | null;
  tarifasTiempo: TarifaTiempoItem[];
  tarifasEvento: TarifaEventoItem[];
}

export interface ItemCarritoOnline {
  id: string; // Identificador único local para reactividad en la cesta
  atraccionId: number;
  nombreAtraccion: string;
  tipoAtraccion: string;
  tipoTarifa: 'TIEMPO' | 'EVENTO';
  tarifaTiempoId?: number | null;
  tarifaEventoId?: number | null;
  duracionMinutos?: number | null;
  intentos?: number | null;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
  nombreMenor: string;
  edadMenor: number;
  documentoMenor?: string | null;
}

export interface ItemCompraOnlineDTO {
  atraccionId: number;
  tipoTarifa: string;
  tarifaTiempoId?: number | null;
  tarifaEventoId?: number | null;
  duracionMinutos?: number | null;
  cantidad: number;
  nombreMenor: string;
  edadMenor: number;
  documentoMenor?: string | null;
}

export interface CompraOnlineRequest {
  documentoAdulto: string;
  nombreAdulto: string;
  telefonoAdulto?: string | null;
  correoAdulto?: string | null;
  metodoPago: string;
  codigoReferenciaPago?: string | null;
  items: ItemCompraOnlineDTO[];
  website?: string | null; // Honeypot anti-spam
}

export interface TicketOnline {
  uuidCodigo: string;
  codigoCorto: string;
  nombreAtraccion: string;
  tipoAtraccion: string;
  tipoTarifa: string;
  duracionMinutos?: number | null;
  intentosTotales?: number | null;
  intentosRestantes?: number | null;
  nombreMenor: string;
  estadoTicket: string;
  fechaEmision: string;
  horaIngresoEstimada?: string | null;
}

export interface CompraOnlineResponse {
  ventaId: number;
  codigoOrden: string;
  fechaVenta: string;
  montoTotal: number;
  subtotal: number;
  impuestos: number;
  metodoPago: string;
  canalVenta: string;
  clienteNombre: string;
  clienteDocumento: string;
  boletas: TicketOnline[];
  mensaje: string;
}
