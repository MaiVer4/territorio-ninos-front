export type TipoHitoTimeline =
  | 'VENTA_CAJA'
  | 'REIMPRESION_TAQUILLA'
  | 'ESCANEO_ACCESO'
  | 'PAUSA_APLICADA'
  | 'REANUDACION_JUEGO'
  | 'CONFIRMACION_SALIDA';

export interface MetadatosTecnicosEvento {
  cajeroEmisor?: string;
  operarioValidador?: string;
  estacionFisica: string;
  duracionMinutosJuego?: number;
  direccionIpTerminal: string;
  dispositivoTerminal?: string;
  motivoIncidente?: string;
}

export interface TimelineEventoTicket {
  idEvento: string;
  tipoHito: TipoHitoTimeline;
  titulo?: string;
  tituloHito?: string;
  descripcion: string;
  fechaHora?: string;
  timestamp?: string;
  icono?: string;
  colorEstado?: 'emerald' | 'blue' | 'amber' | 'purple' | 'slate';
  metadatos: MetadatosTecnicosEvento;
  desplegado?: boolean;
}

export interface AuditoriaTicket {
  ticketUuid: string;
  ticketId?: string;
  codigoBoleta: string;
  clienteDocumento?: string;
  adultoDocumento?: string;
  clienteNombre?: string;
  adultoResponsable?: string;
  menorNombre: string;
  menorEdad?: number;
  atraccionNombre: string;
  modalidad?: string;
  valorPagado?: number;
  metodoPago?: string;
  estadoActual: 'PAGADO' | 'EN_USO' | 'CONSUMIDO' | 'ANULADO' | string;
  fechaCompra?: string;
  eventos: TimelineEventoTicket[];
}

export type SeveridadIncidente = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';

export interface IncidenteOperativo {
  idIncidente: string;
  id?: string;
  atraccionId?: number | string;
  atraccionNombre: string;
  atraccion?: string;
  estacionFisica?: string;
  operarioId?: number | string;
  operarioNombre: string;
  operario?: string;
  menorNombre?: string;
  ticketUuid?: string;
  tipo?: 'PAUSA_INDIVIDUAL' | 'PARADA_EMERGENCIA' | 'TIEMPO_EXCEDIDO' | 'ACCESO_FORZADO' | string;
  severidad: SeveridadIncidente | string;
  motivoJustificado: string;
  motivo?: string;
  fechaHoraInicio: string;
  timestamp?: string;
  fechaHoraFin?: string;
  duracionMinutos: number;
  superaUmbralCincoMinutos: boolean; // true cuando duracionMinutos > 5 (HU-41.07)
}

export interface ResumenInactividadDTO {
  tiempoTotalSuspensionMinutos: number;
  promedioMinutosPausadosPorJuego: number;
  promedioMinutosPausadosPorOperario: number;
  totalIncidentesRegistrados: number;
  pausasMayoresACincoMinutos: number;
  desglosePorAtraccion: { atraccionNombre: string; minutosPausados: number; cantidadPausas: number }[];
}
