import { MetodoPagoPOS, TipoAtraccion } from './enums';

export type EstadoTicket =
  | 'GENERADO'
  | 'PENDIENTE'
  | 'IMPRIMIENDO'
  | 'IMPRESO'
  | 'EMITIDA'
  | 'ACTIVO'
  | 'PAGADO'
  | 'EN_USO'
  | 'CONSUMIDO'
  | 'FINALIZADO'
  | 'ANULADO';

/**
 * Estados visuales consolidados para visualización mediante pills (SCRUM-387 / HU-23.05).
 */
export type EstadoVisualTicket = 'PAGADO' | 'EN_USO' | 'CONSUMIDO';

export interface TiempoRestanteInfo {
  etiqueta: string;
  minutosRestantes: number;
  segundosRestantes?: number;
  caidasRestantes?: number;
  porcentaje: number;
  agotado: boolean;
}

export interface Ticket {
  id?: number | string;
  idTicket?: number | string;
  uuid?: string;
  idVenta?: number | string;
  idOrden?: string;
  codigoBoleta: string;
  codigoQr?: string;
  atraccionId: number | string;
  atraccionNombre: string;
  tipoAtraccion?: TipoAtraccion;
  modalidadEtiqueta: string;
  duracionMinutos?: number;
  caidasPermitidas?: number;
  menorId?: number;
  menorNombre: string;
  menorEdad?: number;
  clienteId?: number;
  clienteNombre?: string;
  clienteDocumento?: string;
  precioUnitario: number;
  metodoPago?: MetodoPagoPOS;
  fechaEmision?: Date | string;
  estado: EstadoTicket;
  observaciones?: string;

  // Seguimiento operativo en tiempo real (HU-23.05 / SCRUM-387)
  horaCompra?: Date | string;
  tiempoRestanteMinutos?: number;
  tiempoRestanteSegundos?: number;
  caidasRestantes?: number;
  horaInicioUso?: Date | string;
  horaFinUso?: Date | string;

  // Metadatos y marca de reimpresión (HU-22.04 / HU-22.05 / Notion: CA-02)
  esReimpresion?: boolean;
  marcaImpresion?: string;
  motivoUltimaReimpresion?: string;
  fechaUltimaReimpresion?: Date | string;
  totalReimpresiones?: number;
}

export interface ContextoVentaTicket {
  idOrden?: string;
  idVenta?: number | string;
  clienteNombre?: string;
  clienteDocumento?: string;
  clienteId?: number;
  metodoPago?: MetodoPagoPOS;
  fechaEmision?: Date | string;
}

export interface ValidacionOpticaQr {
  esValido: boolean;
  versionQr: number;
  tamanoMatriz: number;
  nivelCorreccion: 'L' | 'M' | 'Q' | 'H';
  margenModulos: number;
  contrasteAlto: boolean;
  detalles?: string;
}

export interface VentaResponseDTO {
  idVenta?: number | string;
  idOrden?: string;
  numeroFactura?: string;
  clienteNombre?: string;
  clienteDocumento?: string;
  clienteId?: number;
  metodoPago?: MetodoPagoPOS;
  totalVenta?: number;
  subtotal?: number;
  impuestos?: number;
  fecha?: Date | string;
  boletas?: Partial<Ticket>[];
  tickets?: Partial<Ticket>[];
}

/**
 * Códigos de motivo estandarizados para auditoría de reimpresión (HU-22.06 / SCRUM-382).
 */
export type CodigoMotivoReimpresion =
  | 'ATASCO_PAPEL'
  | 'FALTA_PAPEL'
  | 'BOLETA_ILEGIBLE';

export interface OpcionMotivoReimpresion {
  codigo: CodigoMotivoReimpresion;
  etiqueta: string;
  descripcion: string;
  icono: string;
}

export const OPCIONES_MOTIVO_REIMPRESION: OpcionMotivoReimpresion[] = [
  {
    codigo: 'ATASCO_PAPEL',
    etiqueta: 'Atasco de papel',
    descripcion: 'Atasco físico en el mecanismo de tracción de la impresora térmica',
    icono: '⚠️'
  },
  {
    codigo: 'FALTA_PAPEL',
    etiqueta: 'Falta de papel',
    descripcion: 'El rollo térmico se agotó antes de completar la tirilla de la boleta',
    icono: '📄'
  },
  {
    codigo: 'BOLETA_ILEGIBLE',
    etiqueta: 'Boleta ilegible',
    descripcion: 'Impresión borrosa, código QR deformado o corte imperfecto',
    icono: '🔍'
  }
];

export interface ReimpresionRequestDTO {
  motivo: string;
}

export interface EventoReimpresionDTO {
  id?: number | string;
  idLog?: number | string;
  ticketId?: number | string;
  ticketUuid: string;
  codigoBoleta: string;
  usuarioId?: number | string;
  usuarioNombre?: string;
  motivo: string;
  fechaReimpresion: Date | string;
  marcaImpresion: string;
  ticket?: Partial<Ticket>;
}
