import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AuditoriaTicket,
  IncidenteOperativo,
  ResumenInactividadDTO
} from '../models/auditoria.model';

export interface ResultadoValidacionFormatoBusqueda {
  esValido: boolean;
  tipo: 'UUID_V4' | 'CEDULA' | 'CODIGO_BOLETA' | 'INVALIDO';
  terminoSanitizado?: string;
  mensajeError?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auditoria`;

  /**
   * Valida estrictamente el formato de búsqueda: UUID v4 o Documento de Identidad / Cédula (HU-38.08).
   */
  validarFormatoBusqueda(termino: string): ResultadoValidacionFormatoBusqueda {
    const limpio = (termino || '').trim();
    if (!limpio) {
      return { esValido: false, tipo: 'INVALIDO', terminoSanitizado: '', mensajeError: 'Ingresa un UUID v4 o documento de identidad.' };
    }

    // Expresión regular estándar para UUID v4
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidV4Regex.test(limpio)) {
      return { esValido: true, tipo: 'UUID_V4', terminoSanitizado: limpio };
    }

    // Expresión regular para documento de identidad (cédula colombiana 5 a 12 dígitos)
    const cedulaRegex = /^\d{5,12}$/;
    if (cedulaRegex.test(limpio)) {
      return { esValido: true, tipo: 'CEDULA', terminoSanitizado: limpio };
    }

    // Código legible de boleta
    const codigoBoletaRegex = /^BOL-[A-Z0-9-]{3,15}$/i;
    if (codigoBoletaRegex.test(limpio)) {
      return { esValido: true, tipo: 'CODIGO_BOLETA', terminoSanitizado: limpio.toUpperCase() };
    }

    return {
      esValido: false,
      tipo: 'INVALIDO',
      terminoSanitizado: limpio,
      mensajeError: 'Formato inválido. Debe ser un UUID v4 (ej. 12345678-1234-4234-8234-123456789abc) o cédula numérica (5-12 dígitos).'
    };
  }

  /**
   * Localiza el expediente técnico completo de una boleta con su timeline cronológico (HU-38.08..10).
   */
  buscarExpedienteTicket(termino: string): Observable<AuditoriaTicket | null> {
    const validacion = this.validarFormatoBusqueda(termino);
    if (!validacion.esValido) {
      return of(null);
    }

    return this.http.get<AuditoriaTicket>(`${this.apiUrl}/tickets/${encodeURIComponent(termino.trim())}`).pipe(
      catchError((error: unknown) => {
        // Propagar errores de respuesta HTTP reales del servidor (404, 400, 403, 500)
        if (error instanceof HttpErrorResponse && error.status !== 0) {
          return throwError(() => error);
        }

        // Fallback mock realista exclusivo para contingencia offline (status === 0 / red caída)
        const mock: AuditoriaTicket = {
          ticketUuid: termino.includes('-') && termino.length > 20 ? termino : '4f923b7a-9a81-42e3-b5f7-642a8b9c1d0e',
          codigoBoleta: 'BOL-784920',
          clienteDocumento: validacion.tipo === 'CEDULA' ? termino : '1094857291',
          clienteNombre: 'Carolina Ramírez Ospina',
          menorNombre: 'Samuel Ramírez',
          menorEdad: 6,
          atraccionNombre: 'Laberinto Mágico',
          modalidad: '15 minutos',
          valorPagado: 15000,
          metodoPago: 'TARJETA_DEBITO',
          estadoActual: 'CONSUMIDO',
          fechaCompra: '2026-10-22T10:14:22Z',
          eventos: [
            {
              idEvento: 'EVT-01',
              tipoHito: 'VENTA_CAJA',
              titulo: 'Venta y Emisión de Boleta',
              descripcion: 'Venta registrada y boleta térmica impresa en Punto de Venta.',
              fechaHora: '2026-10-22 10:14:22',
              icono: 'point_of_sale',
              colorEstado: 'emerald',
              metadatos: {
                cajeroEmisor: 'Carlos Gómez (Cajero Principal)',
                estacionFisica: 'Caja 01 • Taquilla Central',
                direccionIpTerminal: '192.168.10.15',
                dispositivoTerminal: 'POS Touch Terminal #01'
              }
            },
            {
              idEvento: 'EVT-02',
              tipoHito: 'ESCANEO_ACCESO',
              titulo: 'Validación de Acceso Óptico',
              descripcion: 'Código QR escaneado por operario en torniquete y acceso autorizado.',
              fechaHora: '2026-10-22 10:25:05',
              icono: 'qr_code_scanner',
              colorEstado: 'blue',
              metadatos: {
                operarioValidador: 'Andrés Morales (Operario)',
                estacionFisica: 'Torniquete Entrada • Laberinto Mágico',
                duracionMinutosJuego: 15,
                direccionIpTerminal: '192.168.10.42',
                dispositivoTerminal: 'Terminal Móvil Zebra TC21'
              }
            },
            {
              idEvento: 'EVT-03',
              tipoHito: 'PAUSA_APLICADA',
              titulo: 'Pausa Temporal de Juego',
              descripcion: 'Sesión pausada temporalmente por acompañamiento del menor al baño.',
              fechaHora: '2026-10-22 10:31:18',
              icono: 'pause_circle',
              colorEstado: 'amber',
              metadatos: {
                operarioValidador: 'Andrés Morales (Operario)',
                estacionFisica: 'Consola Operativa • Laberinto Mágico',
                motivoIncidente: 'Ida al baño del menor',
                duracionMinutosJuego: 3,
                direccionIpTerminal: '192.168.10.42'
              }
            },
            {
              idEvento: 'EVT-04',
              tipoHito: 'CONFIRMACION_SALIDA',
              titulo: 'Evacuación y Salida Verificada',
              descripcion: 'Tiempo de juego culminado, menor entregado a su acudiente y aforo liberado.',
              fechaHora: '2026-10-22 10:43:10',
              icono: 'check_circle',
              colorEstado: 'purple',
              metadatos: {
                operarioValidador: 'Andrés Morales (Operario)',
                estacionFisica: 'Torniquete Salida • Laberinto Mágico',
                duracionMinutosJuego: 18,
                direccionIpTerminal: '192.168.10.42',
                dispositivoTerminal: 'Terminal Móvil Zebra TC21'
              }
            }
          ]
        };
        return of(mock);
      })
    );
  }

  /**
   * Consulta el registro de incidentes y pausas operativas (HU-41.05..07).
   */
  obtenerIncidentesYPausas(): Observable<IncidenteOperativo[]> {
    return this.http.get<IncidenteOperativo[]>(`${this.apiUrl}/incidentes`).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status !== 0) {
          return throwError(() => error);
        }
        const mock: IncidenteOperativo[] = [
          {
            idIncidente: 'INC-201',
            atraccionId: 1,
            atraccionNombre: 'Laberinto Mágico',
            operarioId: 5,
            operarioNombre: 'Andrés Morales',
            menorNombre: 'Mateo Hernández',
            ticketUuid: '4f923b7a-9a81-42e3-b5f7-642a8b9c1d0e',
            tipo: 'PAUSA_INDIVIDUAL',
            severidad: 'MEDIA',
            motivoJustificado: 'Menor requiere acompañamiento al baño',
            fechaHoraInicio: '2026-10-22 10:31:00',
            fechaHoraFin: '2026-10-22 10:34:00',
            duracionMinutos: 3,
            superaUmbralCincoMinutos: false
          },
          {
            idIncidente: 'INC-202',
            atraccionId: 2,
            atraccionNombre: 'Castillo Inflable Gigante',
            operarioId: 6,
            operarioNombre: 'Luisa Fernanda',
            tipo: 'PARADA_EMERGENCIA',
            severidad: 'CRITICA',
            motivoJustificado: 'Falla eléctrica en turbina de inflado principal',
            fechaHoraInicio: '2026-10-22 11:15:00',
            fechaHoraFin: '2026-10-22 11:24:00',
            duracionMinutos: 9,
            superaUmbralCincoMinutos: true // > 5 min -> Resaltado ámbar (HU-41.07)
          },
          {
            idIncidente: 'INC-203',
            atraccionId: 3,
            atraccionNombre: 'Toro Mecánico Infantil',
            operarioId: 7,
            operarioNombre: 'Julián Castro',
            menorNombre: 'Esteban Ruiz',
            ticketUuid: 'b2c3d4e5-f6a1-4b2c-9d3e-234567890bcd',
            tipo: 'PAUSA_INDIVIDUAL',
            severidad: 'ALTA',
            motivoJustificado: 'Mareo del menor y revisión de primeros auxilios',
            fechaHoraInicio: '2026-10-22 14:10:00',
            fechaHoraFin: '2026-10-22 14:18:00',
            duracionMinutos: 8,
            superaUmbralCincoMinutos: true // > 5 min -> Resaltado ámbar (HU-41.07)
          },
          {
            idIncidente: 'INC-204',
            atraccionId: 1,
            atraccionNombre: 'Laberinto Mágico',
            operarioId: 5,
            operarioNombre: 'Andrés Morales',
            tipo: 'PAUSA_INDIVIDUAL',
            severidad: 'BAJA',
            motivoJustificado: 'Ajuste de cintas de señalización interna',
            fechaHoraInicio: '2026-10-22 15:40:00',
            fechaHoraFin: '2026-10-22 15:42:00',
            duracionMinutos: 2,
            superaUmbralCincoMinutos: false
          }
        ];
        return of(mock);
      })
    );
  }

  /**
   * Calcula los KPIs de inactividad, tiempo total y promedios de suspensión (HU-41.08 / CA-04).
   */
  obtenerResumenInactividad(incidentes: IncidenteOperativo[]): ResumenInactividadDTO {
    const lista = incidentes || [];
    const tiempoTotal = lista.reduce((acc, curr) => acc + (curr.duracionMinutos || 0), 0);
    const pausasMayores = lista.filter(i => i.duracionMinutos > 5).length;

    const atraccionesUnicas = new Set(lista.map(i => String(i.atraccionId)));
    const operariosUnicos = new Set(lista.map(i => String(i.operarioId)));

    const promJuego = atraccionesUnicas.size > 0 ? Math.round((tiempoTotal / atraccionesUnicas.size) * 10) / 10 : 0;
    const promOperario = operariosUnicos.size > 0 ? Math.round((tiempoTotal / operariosUnicos.size) * 10) / 10 : 0;

    const desgloseMap = new Map<string, { minutos: number; cantidad: number }>();
    lista.forEach(item => {
      const actual = desgloseMap.get(item.atraccionNombre) || { minutos: 0, cantidad: 0 };
      desgloseMap.set(item.atraccionNombre, {
        minutos: actual.minutos + item.duracionMinutos,
        cantidad: actual.cantidad + 1
      });
    });

    const desglose = Array.from(desgloseMap.entries()).map(([atraccionNombre, val]) => ({
      atraccionNombre,
      minutosPausados: val.minutos,
      cantidadPausas: val.cantidad
    }));

    return {
      tiempoTotalSuspensionMinutos: tiempoTotal,
      promedioMinutosPausadosPorJuego: promJuego,
      promedioMinutosPausadosPorOperario: promOperario,
      totalIncidentesRegistrados: lista.length,
      pausasMayoresACincoMinutos: pausasMayores,
      desglosePorAtraccion: desglose
    };
  }
}
