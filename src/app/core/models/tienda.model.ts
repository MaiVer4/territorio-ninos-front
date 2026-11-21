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
  tipo?: 'TEMPORIZADA' | 'EVENTOS_CAIDAS' | string;
  estado?: string;
  disponibleParaCompra?: boolean;
  cuposLibres: number;
  ocupacionActual?: number;
  capacidadMaxima: number;
  edadMinima: number;
  edadMaxima: number;
  tarifaMinuto?: number | null;
  duracionRecomendadaMinutos?: number | null;
  horaProximoIngreso?: string | null;
  ingresoTexto?: string | null;
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
  horaIngresoEstimada?: string | null;
  ingresoTexto?: string | null;
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
  menorNombre?: string;
  menorEdad?: number;
  documentoMenor?: string | null;
}

export interface CompraOnlineRequest {
  documento?: string;
  documentoAdulto: string;
  nombres?: string;
  nombreAdulto: string;
  apellidos?: string;
  telefono?: string;
  telefonoAdulto?: string | null;
  correo?: string;
  correoAdulto?: string | null;
  metodoPago: string;
  codigoReferenciaPago?: string | null;
  items: ItemCompraOnlineDTO[];
  website?: string | null; // Honeypot anti-spam
}

export interface TicketOnline {
  uuidCodigo: string;
  codigoCorto?: string;
  atraccionId?: number;
  atraccionNombre?: string;
  nombreAtraccion?: string;
  tipoAtraccion?: string;
  tipoTarifa: string;
  modalidadTexto?: string;
  duracionMinutos?: number | null;
  intentosTotales?: number | null;
  intentosRestantes?: number | null;
  menorNombre?: string;
  nombreMenor?: string;
  menorEdad?: number;
  edadMenor?: number;
  precioUnitario?: number;
  estadoTicket: string;
  fechaEmision: string;
  horaIngresoEstimada?: string | null;
  ingresoTexto?: string | null;
  qrData?: string;
}

export interface CompraOnlineResponse {
  ventaId: number;
  codigoOrden: string;
  fechaCompra?: string;
  fechaVenta?: string;
  montoTotal?: number;
  total?: number;
  subtotal: number;
  impuestos: number;
  metodoPago: string;
  canalVenta?: string;
  clienteNombre?: string;
  clienteNombreCompleto?: string;
  clienteDocumento: string;
  clienteCorreo?: string;
  boletas?: TicketOnline[];
  tickets?: TicketOnline[];
  mensaje?: string;
}
