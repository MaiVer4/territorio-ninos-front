export type EstadoTurno = 'ABIERTO' | 'CERRADO' | 'CANCELADO';

export interface TurnoCaja {
  id: number;
  idCaja?: number;
  nombreCaja?: string;
  idUsuario: number;
  nombreCajero?: string;
  montoInicial: number;
  montoFinal?: number;
  totalVentas?: number;
  totalEfectivo?: number;
  totalOtrosMedios?: number;
  fechaApertura: string;
  fechaCierre?: string;
  estado: EstadoTurno;
  observaciones?: string;
}

export interface TurnoResponseDTO {
  idTurno: number;
  cajaId?: number;
  cajaNombre?: string;
  usuarioId: number;
  cajeroNombre?: string;
  montoInicial: number;
  montoFinal?: number;
  totalRecaudado?: number;
  fechaApertura: string;
  fechaCierre?: string;
  estado: EstadoTurno;
  mensaje?: string;
}

export interface AperturaTurnoDTO {
  idCaja?: number;
  montoInicial: number;
  observaciones?: string;
}

export interface CierreTurnoDTO {
  idTurno: number;
  montoFinal: number;
  totalEfectivoReal?: number;
  observaciones?: string;
  diferencia?: number;
  justificacion?: string;
}

export type EstadoBalanceArqueo = 'CUADRADO' | 'SOBRANTE' | 'FALTANTE';

export interface DenominacionConteo {
  valor: number;
  tipo: 'BILLETE' | 'MONEDA';
  cantidad: number;
  subtotal: number;
}

export interface ResultadoArqueoDTO {
  idTurno: number;
  montoEsperado: number;
  totalFisico: number;
  diferencia: number;
  estadoBalance: EstadoBalanceArqueo;
  justificacion?: string;
  desglose: DenominacionConteo[];
}
