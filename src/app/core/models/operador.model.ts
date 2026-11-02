import { TipoAtraccion } from './enums';

export type EstadoEnlaceOperario = 'CONECTADO' | 'RECONECTANDO' | 'SIN_CONEXION';

export interface EstacionTrabajo {
  idAsignacion: number | string;
  atraccionId: number | string;
  atraccionNombre: string;
  tipoAtraccion: TipoAtraccion; // 'TEMPORIZADA' | 'EVENTOS_CAIDAS'
  capacidadMaxima: number;
  ocupacionActual: number;
  duracionMinutosBase: number;
  toleranciaMinutos?: number;
  caidasMaximas?: number;
  edadMinima?: number;
  edadMaxima?: number;
  operarioId: number | string;
  operarioNombre: string;
  confirmada: boolean;
  fechaConfirmacion?: string;
  estadoEnlace: EstadoEnlaceOperario;
  enPausaGeneral?: boolean;
  motivoPausaGeneral?: string;
}

export type CausaRechazoTicket =
  | 'BOLETO_YA_CONSUMIDO'
  | 'ATRACCION_INCORRECTA'
  | 'EDAD_FUERA_RANGO'
  | 'BOLETO_NO_ENCONTRADO'
  | 'AFORO_COMPLETO';

export interface ResultadoValidacionQr {
  aprobado: boolean;
  uuid: string;
  codigoBoleta?: string;
  causaRechazo?: CausaRechazoTicket;
  mensajeExplicativo: string;
  menorNombre?: string;
  menorEdad?: number;
  acudienteNombre?: string;
  acudienteTelefono?: string;
  atraccionId?: number | string;
  atraccionNombre?: string;
  tipoAtraccion?: TipoAtraccion;
  modalidadEtiqueta?: string;
  duracionMinutos?: number;
  caidasPermitidas?: number;
}

export type EstadoSemaforoTarjeta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'PAUSADO';

export type MotivoPausaIncidente =
  | 'BANO_MENOR'
  | 'FALLA_MECANICA'
  | 'INCIDENTE_MEDICO'
  | 'CLIMA_LLUVIA'
  | 'OTRO';

export interface OpcionMotivoPausa {
  codigo: MotivoPausaIncidente;
  etiqueta: string;
  descripcion: string;
}

export const OPCIONES_MOTIVO_PAUSA: OpcionMotivoPausa[] = [
  { codigo: 'BANO_MENOR', etiqueta: 'Ida al baño', descripcion: 'Menor requiere acompañamiento al baño' },
  { codigo: 'INCIDENTE_MEDICO', etiqueta: 'Incidente médico / Físico', descripcion: 'Atención de primeros auxilios o mareo' },
  { codigo: 'FALLA_MECANICA', etiqueta: 'Falla o ajuste técnico', descripcion: 'Revisión técnica o ajuste de seguridad de la atracción' },
  { codigo: 'CLIMA_LLUVIA', etiqueta: 'Clima / Condiciones', descripcion: 'Lluvia u orden externa de suspensión temporal' },
  { codigo: 'OTRO', etiqueta: 'Otro motivo', descripcion: 'Motivo operativo general registrado por el operario' }
];

export interface SesionJuegoMenor {
  idSesion: string;
  ticketUuid: string;
  codigoBoleta: string;
  atraccionId: number | string;
  tipoAtraccion: TipoAtraccion;
  menorNombre: string;
  menorEdad?: number;
  acudienteNombre: string;
  acudienteTelefono?: string;
  horaInicio: string; // ISO string
  horaFin: string;    // ISO string absoluto calculado
  duracionTotalSegundos: number;
  segundosRestantes: number;
  segundosExcedidos: number;
  estadoSemaforo: EstadoSemaforoTarjeta;
  enPausa: boolean;
  motivoPausa?: string;
  segundosCongelados?: number;
  alarmaSilenciada?: boolean;
  preExpiracionNotificada?: boolean;
  
  // Modo Evento / Toro Mecánico (HU-33)
  intentosRealizados?: number;
  intentosMaximos?: number;
  rondaActualActiva?: boolean;
  segundosRondaActual?: number;
  recordSegundosRonda?: number;
  saliendo?: boolean; // Para animación fluida de remoción (HU-32.07)
}

export type TipoAccionOffline =
  | 'CONFIRMAR_SALIDA'
  | 'PAUSAR_SESION'
  | 'REANUDAR_SESION'
  | 'PARADA_EMERGENCIA'
  | 'REGISTRAR_CAIDA';

export interface AccionOfflinePendiente {
  id: string;
  tipo: TipoAccionOffline;
  atraccionId: number | string;
  idSesion?: string;
  ticketUuid?: string;
  payload: Record<string, unknown>;
  timestamp: string;
  reintentos: number;
}
