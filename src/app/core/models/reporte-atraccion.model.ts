export type TipoReporteAtraccion =
  | 'DANO'
  | 'FALTA_SUPLEMENTOS'
  | 'MANTENIMIENTO_PREVENTIVO'
  | 'OTRO';

export type SeveridadReporte = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type EstadoReporteAtraccion = 'ABIERTO' | 'EN_PROCESO' | 'RESUELTO';

export interface ReporteAtraccion {
  id: number;
  atraccionId: number;
  atraccionNombre: string;
  atraccionEstadoActual?: string;
  usuarioReportaId: number;
  usuarioReportaNombre: string;
  tipoReporte: TipoReporteAtraccion;
  severidad: SeveridadReporte;
  descripcion: string;
  estado: EstadoReporteAtraccion;
  atraccionDesactivada: boolean;
  fechaReporte: string;
  fechaResolucion?: string | null;
  usuarioResuelveId?: number | null;
  usuarioResuelveNombre?: string | null;
  observacionesResolucion?: string | null;
}

export interface ReporteAtraccionRequest {
  atraccionId: number;
  tipoReporte: TipoReporteAtraccion;
  severidad: SeveridadReporte;
  descripcion: string;
  desactivarAtraccion: boolean;
}

export interface ReporteAtraccionEstadoRequest {
  estado: EstadoReporteAtraccion;
  observacionesResolucion?: string;
  reactivarAtraccion?: boolean;
}
