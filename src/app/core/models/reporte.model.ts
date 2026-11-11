import { MetodoPagoPOS, TipoAtraccion } from './enums';

export interface BoletaVendidaTurno {
  idBoleta: string;
  codigoBoleta: string;
  uuid: string;
  horaVenta: string;
  atraccionNombre: string;
  menorNombre: string;
  metodoPago: MetodoPagoPOS;
  valor: number;
}

export interface DetalleConciliacionTurno {
  turnoId: number;
  cajeroId: number;
  cajeroNombre: string;
  cajaNombre: string;
  fechaApertura: string;
  fechaCierre?: string;
  montoBase: number;
  recaudoEfectivo: number;
  recaudoElectronico: number;
  totalVentas: number;
  efectivoEsperado: number;
  efectivoFisicoDeclarado: number;
  diferenciaArqueo: number;
  tieneDescuadre: boolean;
  justificacionDescuadre?: string;
  boletasVendidas: BoletaVendidaTurno[];
}

export interface ReporteTurno {
  id: number;
  idUsuario: number;
  cajero: string;
  rol: string;
  apertura: string;
  cierre?: string;
  base: number;
  efectivo: number;
  electronico: number;
  ventas: number;       // Total recaudado
  esperado: number;     // Base + Efectivo
  fisico: number;       // Declarado en arqueo
  diferencia: number;   // Fisico - Esperado
  tieneDescuadre: boolean;
  tiquetes: number;
  activo: boolean;
  boletas?: BoletaVendidaTurno[];
}

export type CriterioOrdenRotacion = 'visitas' | 'ocupacionPromedio' | 'ingresosBrutos';

export interface RotacionAtraccion {
  atraccionId: number | string;
  nombre: string;
  tipo: TipoAtraccion;
  volumenVisitas: number;
  ocupacionPromedioPorcentaje: number;
  ingresosBrutos: number;
  tiempoPromedioMinutos: number;
  tendenciaPorcentaje?: number;
}

export type PeriodoReporte = 'HOY' | 'ULTIMOS_7_DIAS' | 'ESTE_MES' | 'PERSONALIZADO';

export interface FiltroPeriodoReporte {
  periodo: PeriodoReporte;
  fechaInicio?: string;
  fechaFin?: string;
  cajeroId?: number | string;
}

export interface DatosGraficosReporte {
  ventasPorHora: { hora: string; ventasCop: number; afluencia: number }[];
  evolucionSemanal: { fecha: string; etiquetaDia: string; ingresosCop: number }[];
  distribucionMetodosPago: { metodo: MetodoPagoPOS; etiqueta: string; montoCop: number; porcentaje: number }[];
}
