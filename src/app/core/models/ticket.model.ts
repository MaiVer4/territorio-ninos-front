import { MetodoPagoPOS, TipoAtraccion } from './enums';

export type EstadoTicket =
  | 'GENERADO'
  | 'PENDIENTE'
  | 'IMPRIMIENDO'
  | 'IMPRESO'
  | 'EMITIDA'
  | 'ACTIVO'
  | 'EN_USO'
  | 'FINALIZADO'
  | 'ANULADO';

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
