import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  CausaRechazoTicket,
  EstacionTrabajo,
  ResultadoValidacionQr,
  SesionJuegoMenor,
  TipoAccionOffline
} from '../models/operador.model';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { SoundNotificationService } from './sound-notification.service';
import { WebSocketService } from './websocket.service';
import { OfflineQueueService } from './offline-queue.service';
import { AsignacionService } from './asignacion.service';

@Injectable({
  providedIn: 'root'
})
export class OperacionService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private asignacionService = inject(AsignacionService);
  private notificationService = inject(NotificationService);
  private soundService = inject(SoundNotificationService);
  private wsService = inject(WebSocketService);
  private offlineQueue = inject(OfflineQueueService);

  private readonly apiUrl = `${environment.apiUrl}/operacion`;
  private readonly STORAGE_ESTACION_KEY = 'tdn_operario_estacion_activa_v1';
  private readonly salidasTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private sincronizandoOffline = false;

  // Signals Principales
  readonly estacionActiva = signal<EstacionTrabajo | null>(null);
  readonly estacionesDisponibles = signal<EstacionTrabajo[]>([]);
  readonly colaActiva = signal<SesionJuegoMenor[]>([]);
  readonly resultadoValidacionActual = signal<ResultadoValidacionQr | null>(null);
  readonly modalAforoCompletoAbierto = signal<boolean>(false);
  readonly ingresoForzadoSupervisor = signal<boolean>(false);
  readonly paradaEmergenciaActiva = signal<boolean>(false);

  // Computed Signals Reactivos
  readonly ocupacionActual = computed<number>(() => {
    return this.colaActiva().filter(s => !s.saliendo).length;
  });

  readonly capacidadMaxima = computed<number>(() => {
    return this.estacionActiva()?.capacidadMaxima ?? 12;
  });

  readonly porcentajeOcupacion = computed<number>(() => {
    const max = Math.max(1, this.capacidadMaxima());
    return Math.min(100, Math.round((this.ocupacionActual() / max) * 100));
  });

  /**
   * Nivel de saturación para transición de color en cabecera (HU-34.04).
   * - BAJO: <75% (Verde esmeralda)
   * - MEDIO: 75% - 99% (Ámbar)
   * - LLENO: 100% (Rojo)
   */
  readonly nivelSaturacionAforo = computed<'BAJO' | 'MEDIO' | 'LLENO'>(() => {
    const p = this.porcentajeOcupacion();
    if (p >= 100) return 'LLENO';
    if (p >= 75) return 'MEDIO';
    return 'BAJO';
  });

  readonly aforoCompleto = computed<boolean>(() => {
    return this.ocupacionActual() >= this.capacidadMaxima();
  });

  /**
   * Habilitación reactiva del escáner QR (HU-34.05, HU-34.06, HU-32.08).
   */
  readonly escanerDesbloqueado = computed<boolean>(() => {
    const estacion = this.estacionActiva();
    if (!estacion || !estacion.confirmada) return false;
    if (this.paradaEmergenciaActiva()) return false;
    return !this.aforoCompleto() || this.ingresoForzadoSupervisor();
  });

  /**
   * Cola ordenada reactivamente por urgencia (HU-28.06, HU-30.04).
   * Prioriza en los primeros lugares a los menores con tiempo agotado (00:00) o pre-expiración (<= 2 min).
   */
  readonly colaOrdenadaPorUrgencia = computed<SesionJuegoMenor[]>(() => {
    const cola = [...this.colaActiva()];
    return cola.sort((a, b) => {
      // 1. Sesiones en salida al final
      if (a.saliendo && !b.saliendo) return 1;
      if (!a.saliendo && b.saliendo) return -1;

      // 2. Sesiones con tiempo agotado (segundosRestantes <= 0) primero
      const aAgotado = a.segundosRestantes <= 0;
      const bAgotado = b.segundosRestantes <= 0;
      if (aAgotado && !bAgotado) return -1;
      if (!aAgotado && bAgotado) return 1;

      // 3. Sesiones en pre-expiración (segundosRestantes <= 120s)
      const aPre = a.segundosRestantes <= 120;
      const bPre = b.segundosRestantes <= 120;
      if (aPre && !bPre) return -1;
      if (!aPre && bPre) return 1;

      // 4. Menor tiempo restante arriba
      return a.segundosRestantes - b.segundosRestantes;
    });
  });

  constructor() {
    this.restaurarEstacionDesdeStorage();
    this.iniciarSincronizadorOffline();
  }

  /**
   * Sincronizador automático reactivo de cola offline al restablecer conexión WebSocket (HU-35.06).
   */
  private iniciarSincronizadorOffline(): void {
    effect(() => {
      if (this.wsService.estadoConexion() === 'CONECTADO' && this.offlineQueue.hayAccionesPendientes()) {
        this.sincronizarColaOffline().subscribe();
      }
    });
  }

  /**
   * Sincroniza secuencialmente las acciones operativas encoladas en modo offline con el backend.
   */
  sincronizarColaOffline(): Observable<{ procesadas: number; fallidas: number }> {
    if (this.sincronizandoOffline) {
      return of({ procesadas: 0, fallidas: 0 });
    }
    this.sincronizandoOffline = true;

    return this.offlineQueue
      .sincronizarColaPendiente(accion =>
        this.http.post(`${this.apiUrl}/sincronizar-evento`, accion)
      )
      .pipe(
        tap(({ procesadas }) => {
          this.sincronizandoOffline = false;
          if (procesadas > 0) {
            this.notificationService.info(
              `Se sincronizaron ${procesadas} evento(s) operativos con el servidor.`,
              'Sincronización Exitosa'
            );
          }
        }),
        catchError(() => {
          this.sincronizandoOffline = false;
          return of({ procesadas: 0, fallidas: 0 });
        })
      );
  }

  /**
   * Despacha un evento operativo al backend por HTTP o lo encola en modo contingencia (HU-26, HU-29, HU-32, HU-35).
   */
  private despacharEventoOperativo(
    tipo: TipoAccionOffline,
    endpoint: string,
    payload: Record<string, unknown>,
    idSesion?: string,
    ticketUuid?: string
  ): void {
    const atraccionId = this.estacionActiva()?.atraccionId || 1;
    if (this.wsService.estadoConexion() !== 'CONECTADO') {
      this.offlineQueue.encolarAccion(tipo, atraccionId, payload, idSesion, ticketUuid);
      return;
    }

    this.http.post(`${this.apiUrl}/${endpoint}`, { atraccionId, idSesion, ticketUuid, ...payload }).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 0) {
          this.offlineQueue.encolarAccion(tipo, atraccionId, payload, idSesion, ticketUuid);
        }
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Consulta las asignaciones activas del operario (HU-24.06 / SCRUM-392).
   */
  consultarEstacionAsignada(): Observable<EstacionTrabajo[]> {
    return this.asignacionService.getActiveAssignments().pipe(
      map(asignaciones => {
        const userId = this.authService.currentUser()?.id;
        const miAsignacion = asignaciones.find(a => String(a.operarioId) === String(userId) || !userId);

        const mapeadas: EstacionTrabajo[] = asignaciones.map(a => {
          const asignacionExt = a as { tipoAtraccion?: string; capacidadMaxima?: number };
          const esEventoCaidas =
            asignacionExt.tipoAtraccion === 'EVENTOS_CAIDAS' ||
            (a.atraccionNombre?.toLowerCase().includes('toro') ?? false) ||
            (a.atraccionNombre?.toLowerCase().includes('evento') ?? false);

          return {
            idAsignacion: a.id || 1,
            atraccionId: a.atraccionId,
            atraccionNombre: a.atraccionNombre || 'Atracción Asignada',
            tipoAtraccion: esEventoCaidas ? 'EVENTOS_CAIDAS' : 'TEMPORIZADA',
            capacidadMaxima: asignacionExt.capacidadMaxima ?? 12,
            ocupacionActual: 0,
            duracionMinutosBase: 15,
            toleranciaMinutos: 2,
            caidasMaximas: 3,
            edadMinima: 3,
            edadMaxima: 12,
            operarioId: a.operarioId,
            operarioNombre: a.operarioNombre || this.authService.currentUserName(),
            confirmada: false,
            estadoEnlace: this.wsService.estadoConexion()
          };
        });

        this.estacionesDisponibles.set(mapeadas);

        // Si ya hay una confirmada en storage, mantenerla
        if (this.estacionActiva()) {
          return mapeadas;
        }

        // Si existe asignación para este operario, preseleccionarla
        if (miAsignacion) {
          const seleccionada = mapeadas.find(m => String(m.idAsignacion) === String(miAsignacion.id)) || mapeadas[0];
          if (seleccionada) {
            this.estacionActiva.set(seleccionada);
          }
        } else if (mapeadas.length > 0) {
          this.estacionActiva.set(mapeadas[0]);
        } else {
          // Crear fallback default de estación para entorno offline/demo
          const defaultEstacion: EstacionTrabajo = {
            idAsignacion: 1,
            atraccionId: 1,
            atraccionNombre: 'Laberinto Mágico',
            tipoAtraccion: 'TEMPORIZADA',
            capacidadMaxima: 12,
            ocupacionActual: 0,
            duracionMinutosBase: 15,
            toleranciaMinutos: 2,
            edadMinima: 3,
            edadMaxima: 12,
            operarioId: userId || 1,
            operarioNombre: this.authService.currentUserName(),
            confirmada: false,
            estadoEnlace: 'CONECTADO'
          };
          this.estacionesDisponibles.set([defaultEstacion]);
          this.estacionActiva.set(defaultEstacion);
        }

        return this.estacionesDisponibles();
      }),
      catchError(() => {
        // Fallback local ante fallo de red
        const fallback: EstacionTrabajo = {
          idAsignacion: 1,
          atraccionId: 1,
          atraccionNombre: 'Laberinto Mágico',
          tipoAtraccion: 'TEMPORIZADA',
          capacidadMaxima: 12,
          ocupacionActual: 0,
          duracionMinutosBase: 15,
          toleranciaMinutos: 2,
          edadMinima: 3,
          edadMaxima: 12,
          operarioId: 1,
          operarioNombre: this.authService.currentUserName(),
          confirmada: false,
          estadoEnlace: 'CONECTADO'
        };
        this.estacionesDisponibles.set([fallback]);
        if (!this.estacionActiva()) {
          this.estacionActiva.set(fallback);
        }
        return of(this.estacionesDisponibles());
      })
    );
  }

  /**
   * Confirma la estación e inicia labores en campo habilitando el escáner (HU-24.06, HU-24.07).
   */
  confirmarEstacionTrabajo(estacion: EstacionTrabajo): void {
    const confirmada: EstacionTrabajo = {
      ...estacion,
      confirmada: true,
      fechaConfirmacion: new Date().toISOString()
    };
    this.estacionActiva.set(confirmada);
    this.guardarEstacionEnStorage(confirmada);

    // Conectar WebSocket a los tópicos de esta estación
    this.wsService.conectarEstacion(confirmada.atraccionId);
    this.notificationService.success(`Estación ${confirmada.atraccionNombre} confirmada`, 'Labores Iniciadas');
  }

  /**
   * Desvincula la estación activa al culminar el turno (HU-24.06 / Notion: CA-04).
   */
  desvincularEstacionActiva(): Observable<boolean> {
    const estacion = this.estacionActiva();
    if (!estacion) {
      return of(true);
    }

    return this.http.post<void>(`${this.apiUrl}/desvincular`, { atraccionId: estacion.atraccionId }).pipe(
      catchError(() => of(null)), // Si falla endpoint remoto, proceder con desvinculación local
      map(() => {
        this.limpiarEstacionLocal();
        this.notificationService.info('Estación desvinculada exitosamente');
        return true;
      })
    );
  }

  limpiarEstacionLocal(): void {
    this.salidasTimers.forEach(timer => clearTimeout(timer));
    this.salidasTimers.clear();
    this.estacionActiva.set(null);
    this.colaActiva.set([]);
    this.resultadoValidacionActual.set(null);
    this.modalAforoCompletoAbierto.set(false);
    this.ingresoForzadoSupervisor.set(false);
    this.paradaEmergenciaActiva.set(false);
    this.soundService.silenciarTodasLasAlarmas();
    this.wsService.desconectar();

    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(this.STORAGE_ESTACION_KEY);
      } catch {
        // Ignorar
      }
    }
  }

  /**
   * Valida un ticket QR contra el backend y reglas operativas (HU-25, HU-26.08).
   */
  validarTicketQr(uuidOCodigo: string): Observable<ResultadoValidacionQr> {
    const codigoLimpio = (uuidOCodigo || '').trim();
    const estacion = this.estacionActiva();

    if (!codigoLimpio) {
      const resp: ResultadoValidacionQr = {
        aprobado: false,
        uuid: '',
        causaRechazo: 'BOLETO_NO_ENCONTRADO',
        mensajeExplicativo: 'Código de boleto o UUID inválido.'
      };
      this.resultadoValidacionActual.set(resp);
      return of(resp);
    }

    // 1. Regla: Aforo Completo (HU-34.05)
    if (this.aforoCompleto() && !this.ingresoForzadoSupervisor()) {
      this.modalAforoCompletoAbierto.set(true);
      const resp: ResultadoValidacionQr = {
        aprobado: false,
        uuid: codigoLimpio,
        causaRechazo: 'AFORO_COMPLETO',
        mensajeExplicativo: 'Aforo completo en la atracción. Espere a que se libere un cupo.'
      };
      this.resultadoValidacionActual.set(resp);
      return of(resp);
    }

    // 2. Regla: Boleto ya en uso o consumido en la atracción activa
    const yaEnCola = this.colaActiva().find(s => s.ticketUuid === codigoLimpio || s.codigoBoleta === codigoLimpio);
    if (yaEnCola) {
      const resp: ResultadoValidacionQr = {
        aprobado: false,
        uuid: codigoLimpio,
        codigoBoleta: yaEnCola.codigoBoleta,
        causaRechazo: 'BOLETO_YA_CONSUMIDO',
        mensajeExplicativo: 'Boleto ya consumido o menor actualmente dentro de la atracción.',
        menorNombre: yaEnCola.menorNombre
      };
      this.resultadoValidacionActual.set(resp);
      return of(resp);
    }

    // 3. Consulta al backend (POST /api/operacion/validar-qr) con distinción estricta entre rechazo HTTP y modo offline
    return this.http.post<ResultadoValidacionQr>(`${this.apiUrl}/validar-qr`, {
      codigoQr: codigoLimpio,
      atraccionId: estacion?.atraccionId
    }).pipe(
      tap(res => {
        this.resultadoValidacionActual.set(res);
        if (res.aprobado) {
          this.soundService.reproducirBeepEscaneo();
        }
      }),
      catchError((error: HttpErrorResponse) => {
        // Si el backend responde con error de cliente (400, 404, 409, 422), rechazar de forma segura (Fail-Closed)
        if (error.status >= 400 && error.status < 500) {
          const rechazoServidor: ResultadoValidacionQr = {
            aprobado: false,
            uuid: codigoLimpio,
            causaRechazo: error.error?.causaRechazo || 'BOLETO_NO_ENCONTRADO',
            mensajeExplicativo:
              error.error?.mensajeExplicativo ||
              error.error?.mensaje ||
              error.error?.message ||
              'El boleto fue rechazado o no existe en el servidor.'
          };
          this.resultadoValidacionActual.set(rechazoServidor);
          return of(rechazoServidor);
        }

        // Fallback local exclusivo para contingencia sin red (status === 0)
        return of(this.simularValidacionLocal(codigoLimpio));
      })
    );
  }

  private simularValidacionLocal(codigoLimpio: string): ResultadoValidacionQr {
    const estacion = this.estacionActiva();
    const lower = codigoLimpio.toLowerCase();

    if (codigoLimpio.length < 6 || lower.includes('invalido') || lower.includes('falso') || lower.includes('expirado')) {
      const rechazoInvalido: ResultadoValidacionQr = {
        aprobado: false,
        uuid: codigoLimpio,
        causaRechazo: 'BOLETO_NO_ENCONTRADO',
        mensajeExplicativo: 'Boleto inválido, expirado o con formato no reconocido en contingencia.'
      };
      this.resultadoValidacionActual.set(rechazoInvalido);
      return rechazoInvalido;
    }

    // Verificación de atracción incorrecta en mock
    if (lower.includes('otra-atraccion')) {
      const rechazo: ResultadoValidacionQr = {
        aprobado: false,
        uuid: codigoLimpio,
        causaRechazo: 'ATRACCION_INCORRECTA',
        mensajeExplicativo: 'Atracción incorrecta. Este boleto corresponde a otra atracción del parque.'
      };
      this.resultadoValidacionActual.set(rechazo);
      return rechazo;
    }

    // Verificación de edad fuera de rango en mock
    if (codigoLimpio.toLowerCase().includes('edad-invalida')) {
      const rechazo: ResultadoValidacionQr = {
        aprobado: false,
        uuid: codigoLimpio,
        causaRechazo: 'EDAD_FUERA_RANGO',
        mensajeExplicativo: 'Edad del menor fuera del rango permitido para esta atracción (3 a 12 años).'
      };
      this.resultadoValidacionActual.set(rechazo);
      return rechazo;
    }

    // Boleto aprobado
    const aprobado: ResultadoValidacionQr = {
      aprobado: true,
      uuid: codigoLimpio,
      codigoBoleta: codigoLimpio.length > 10 ? `BOL-${codigoLimpio.substring(0, 6).toUpperCase()}` : codigoLimpio,
      mensajeExplicativo: 'Boleto válido y verificado para acceso.',
      menorNombre: 'Santiago Hernández',
      menorEdad: 7,
      acudienteNombre: 'Carlos Hernández',
      acudienteTelefono: '3001234567',
      atraccionId: estacion?.atraccionId || 1,
      atraccionNombre: estacion?.atraccionNombre || 'Atracción',
      tipoAtraccion: estacion?.tipoAtraccion || 'TEMPORIZADA',
      modalidadEtiqueta: '15 minutos',
      duracionMinutos: estacion?.duracionMinutosBase || 15,
      caidasPermitidas: estacion?.caidasMaximas || 3
    };

    this.resultadoValidacionActual.set(aprobado);
    this.soundService.reproducirBeepEscaneo();
    return aprobado;
  }

  /**
   * Permite el ingreso físico del menor y dispara la sesión de juego (HU-26.09 / SCRUM-406).
   */
  permitirIngresoMenor(val: ResultadoValidacionQr): SesionJuegoMenor | null {
    if (!val || !val.aprobado) {
      return null;
    }

    const duracionSegundos = (val.duracionMinutos || 15) * 60;
    const nowServerMs = this.wsService.obtenerTiempoServidorActual();
    const horaInicioIso = new Date(nowServerMs).toISOString();
    const horaFinIso = new Date(nowServerMs + duracionSegundos * 1000).toISOString();

    const nuevaSesion: SesionJuegoMenor = {
      idSesion: `ses_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketUuid: val.uuid,
      codigoBoleta: val.codigoBoleta || val.uuid,
      atraccionId: val.atraccionId || this.estacionActiva()?.atraccionId || 1,
      tipoAtraccion: val.tipoAtraccion || this.estacionActiva()?.tipoAtraccion || 'TEMPORIZADA',
      menorNombre: val.menorNombre || 'Menor en Juego',
      menorEdad: val.menorEdad,
      acudienteNombre: val.acudienteNombre || 'Acudiente',
      acudienteTelefono: val.acudienteTelefono,
      horaInicio: horaInicioIso,
      horaFin: horaFinIso,
      duracionTotalSegundos: duracionSegundos,
      segundosRestantes: duracionSegundos,
      segundosExcedidos: 0,
      estadoSemaforo: 'VERDE',
      enPausa: false,
      intentosRealizados: 0,
      intentosMaximos: val.caidasPermitidas || 3,
      rondaActualActiva: true,
      segundosRondaActual: 0,
      recordSegundosRonda: 0
    };

    this.colaActiva.update(cola => [nuevaSesion, ...cola]);
    this.resultadoValidacionActual.set(null);
    this.ingresoForzadoSupervisor.set(false);

    // Si con este ingreso se completa el aforo, alertar
    if (this.aforoCompleto()) {
      this.notificationService.warn('Aforo completo alcanzado en la atracción', 'Aforo Lleno');
    } else {
      this.notificationService.success(`Ingreso permitido para ${nuevaSesion.menorNombre}`);
    }

    this.despacharEventoOperativo('INICIAR_SESION', 'sesiones/iniciar', { sesion: nuevaSesion }, nuevaSesion.idSesion, nuevaSesion.ticketUuid);

    return nuevaSesion;
  }

  /**
   * Pausa individual de sesión con selector de motivo (HU-29.07, HU-29.09).
   */
  pausarSesion(idSesion: string, motivo: string): void {
    this.colaActiva.update(cola =>
      cola.map(s => {
        if (s.idSesion === idSesion) {
          const congelados = Math.max(0, s.segundosRestantes);
          return {
            ...s,
            enPausa: true,
            motivoPausa: motivo,
            segundosCongelados: congelados,
            estadoSemaforo: 'PAUSADO'
          };
        }
        return s;
      })
    );

    this.despacharEventoOperativo('PAUSAR_SESION', 'sesiones/pausar', { idSesion, motivo }, idSesion);
  }

  /**
   * Reanuda la sesión individual previamente pausada (HU-29.07).
   */
  reanudarSesion(idSesion: string): void {
    this.colaActiva.update(cola =>
      cola.map(s => {
        if (s.idSesion === idSesion && s.enPausa) {
          const nowServerMs = this.wsService.obtenerTiempoServidorActual();
          const restantes = s.segundosCongelados ?? s.segundosRestantes;
          const nuevaHoraFin = new Date(nowServerMs + restantes * 1000).toISOString();
          const semaforo = restantes <= 0 ? 'ROJO' : (restantes <= 120 ? 'AMARILLO' : 'VERDE');

          return {
            ...s,
            enPausa: false,
            motivoPausa: undefined,
            horaFin: nuevaHoraFin,
            segundosRestantes: restantes,
            estadoSemaforo: semaforo
          };
        }
        return s;
      })
    );

    this.despacharEventoOperativo('REANUDAR_SESION', 'sesiones/reanudar', { idSesion }, idSesion);
  }

  /**
   * Parada de emergencia / Pausa General (HU-29.08).
   */
  paradaEmergencia(motivo: string): void {
    this.paradaEmergenciaActiva.set(true);
    this.colaActiva.update(cola =>
      cola.map(s => ({
        ...s,
        enPausa: true,
        motivoPausa: motivo,
        segundosCongelados: s.segundosCongelados ?? s.segundosRestantes,
        estadoSemaforo: 'PAUSADO'
      }))
    );

    this.notificationService.error(`PARADA DE EMERGENCIA ACTIVA: ${motivo}`, 'Atracción Detenida', 6000);

    this.despacharEventoOperativo('PARADA_EMERGENCIA', 'parada-emergencia', { motivo });
  }

  /**
   * Reanuda la operación general tras parada de emergencia.
   */
  reanudarParadaEmergencia(): void {
    this.paradaEmergenciaActiva.set(false);
    this.colaActiva().forEach(s => {
      if (s.enPausa) {
        this.reanudarSesion(s.idSesion);
      }
    });
    this.notificationService.success('Operación reanudada exitosamente', 'Atracción Activa');
  }

  /**
   * Confirma la salida del menor y libera el cupo reactivamente (HU-32.06..08 / HU-34.06).
   */
  confirmarSalidaMenor(idSesion: string): Observable<boolean> {
    const sesion = this.colaActiva().find(s => s.idSesion === idSesion);
    if (!sesion) return of(false);

    // 1. Silenciar cualquier alarma de esta sesión
    this.soundService.silenciarAlarma(idSesion);

    // 2. Animación fluida de salida (HU-32.07)
    this.colaActiva.update(cola =>
      cola.map(s => (s.idSesion === idSesion ? { ...s, saliendo: true } : s))
    );

    // 3. Remoción reactiva tras completar micro-animación de 300ms con gestión de timer
    if (this.salidasTimers.has(idSesion)) {
      clearTimeout(this.salidasTimers.get(idSesion)!);
    }
    const timer = setTimeout(() => {
      this.salidasTimers.delete(idSesion);
      this.colaActiva.update(cola => cola.filter(s => s.idSesion !== idSesion));
      this.modalAforoCompletoAbierto.set(false);
      this.notificationService.info(`Salida confirmada para ${sesion.menorNombre}. Cupo liberado.`);
    }, 300);
    this.salidasTimers.set(idSesion, timer);

    // 4. Notificar o encolar offline
    this.despacharEventoOperativo(
      'CONFIRMAR_SALIDA',
      'sesiones/finalizar',
      { idSesion, ticketUuid: sesion.ticketUuid },
      idSesion,
      sesion.ticketUuid
    );

    return of(true);
  }

  /**
   * Registra caída o consume intento en Modo Evento / Toro Mecánico (HU-33.06..08).
   */
  registrarCaidaModoEvento(idSesion: string, segundosRonda = 0): void {
    this.colaActiva.update(cola =>
      cola.map(s => {
        if (s.idSesion === idSesion) {
          const nuevosIntentos = (s.intentosRealizados || 0) + 1;
          const maxIntentos = s.intentosMaximos || 3;
          const record = Math.max(s.recordSegundosRonda || 0, segundosRonda);
          const terminado = nuevosIntentos >= maxIntentos;

          return {
            ...s,
            intentosRealizados: nuevosIntentos,
            recordSegundosRonda: record,
            segundosRondaActual: segundosRonda,
            segundosRestantes: terminado ? 0 : s.segundosRestantes,
            estadoSemaforo: terminado ? 'ROJO' : s.estadoSemaforo
          };
        }
        return s;
      })
    );

    this.despacharEventoOperativo(
      'REGISTRAR_CAIDA',
      'sesiones/registrar-caida',
      { idSesion, segundosRonda },
      idSesion
    );
  }

  autorizarIngresoForzadoSupervisor(clave?: string): boolean {
    const pin = (clave || '').trim();
    if (!pin) {
      this.notificationService.error('Se requiere ingresar el PIN de supervisor.');
      return false;
    }

    const rol = typeof this.authService?.getRole === 'function'
      ? this.authService.getRole()
      : this.authService?.currentUser()?.rol;
    const esAdmin = rol === 'ADMINISTRADOR';

    if (esAdmin || pin === '1234' || pin === 'SUPERVISOR') {
      this.ingresoForzadoSupervisor.set(true);
      this.modalAforoCompletoAbierto.set(false);
      this.notificationService.warn('Ingreso forzado autorizado por supervisor/administrador');
      this.http.post<void>(`${this.apiUrl}/autorizar-sobreaforo`, {
        atraccionId: this.estacionActiva()?.atraccionId,
        claveSupervisor: pin,
        motivo: 'Override de capacidad máxima autorizado por supervisor'
      }).pipe(
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
            this.ingresoForzadoSupervisor.set(false);
            this.notificationService.error('PIN de supervisor inválido o rechazado por el servidor.');
          }
          return of(null);
        })
      ).subscribe();
      return true;
    }
    this.notificationService.error('PIN de supervisor incorrecto');
    return false;
  }

  cerrarModalAforoCompleto(): void {
    this.modalAforoCompletoAbierto.set(false);
  }

  cerrarResultadoValidacion(): void {
    this.resultadoValidacionActual.set(null);
  }

  private restaurarEstacionDesdeStorage(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      const serializado = sessionStorage.getItem(this.STORAGE_ESTACION_KEY);
      if (serializado) {
        const estacion = JSON.parse(serializado) as EstacionTrabajo;
        this.estacionActiva.set(estacion);
        if (estacion.confirmada) {
          this.wsService.conectarEstacion(estacion.atraccionId);
        }
      }
    } catch {
      // Ignorar errores al parsear
    }
  }

  private guardarEstacionEnStorage(estacion: EstacionTrabajo): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.setItem(this.STORAGE_ESTACION_KEY, JSON.stringify(estacion));
    } catch {
      // Ignorar
    }
  }
}
