export interface AsignacionOperario {
  id?: number | string;
  atraccionId: number | string;
  atraccionNombre?: string;
  operarioId: number | string;
  operarioNombre?: string;
  operarioCorreo?: string;
  fechaAsignacion?: string;
  activo: boolean;
  nota?: string;
}

export interface ConflictoAsignacion {
  mensaje: string;
  operarioId: number | string;
  operarioNombre: string;
  atraccionActualId: number | string;
  atraccionActualNombre: string;
}
