import { Injectable, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
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
import { AtraccionService } from './atraccion.service';

interface SesionServidorDTO {
  sesionId: number | string;
  ticketUuid?: string;
  atraccionId?: number | string;
  menorNombre?: string;
  menorEdad?: number;
  acudienteNombre?: string;
  acudienteTelefono?: string;
  duracionSegundos?: number;
  segundosRestantes?: number;
  tiempoRestantePausa?: number;
  estadoSesion?: string;
  segundosExceso?: number;
  intentosTotales?: number;
  intentosRestantes?: number;
}

interface ColaServidorDTO {
  atraccionId?: number | string;
  capacidadMaxima?: number;
  ocupacionActiva?: number;
  sesionesActivas?: SesionServidorDTO[];
}

@Injectable({
  providedIn: 'root'
})
export class OperacionService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private asignacionService = inject(AsignacionService);
  private atraccionService = inject(AtraccionService);
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
    this.iniciarSincronizadorColaServidor();
  }

  /**
   * Fuente única de aforo: la cola local se reconcilia con las sesiones EN_CURSO/PAUSADA
   * que el backend difunde en cada evento WebSocket de la estación.
   */
  private iniciarSincronizadorColaServidor(): void {
    effect(() => {
      const mensaje = this.wsService.ultimoMensajeRecibido?.();
      const estacion = this.estacionActiva();
      if (!mensaje || !estacion?.confirmada) return;
      if (String(mensaje.atraccionId) !== String(estacion.atraccionId)) return;
      if (mensaje.tipo === 'ESTADO_ATRACCION_CAMBIADO') {
        if (mensaje.estadoAtraccion === 'FUERA_DE_SERVICIO') {
          this.notificationService.warn(
            mensaje.mensaje || 'Esta atracción fue marcada Fuera de Servicio por coordinación. No se permiten nuevos ingresos; los menores actuales pueden finalizar con normalidad.',
            'Atracción Fuera de Servicio'
          );
        } else if (mensaje.estadoAtraccion === 'ACTIVO') {
          this.notificationService.success(
            mensaje.mensaje || 'La atracción fue reactivada y vuelve a estar operativa.',
            'Atracción Reactivada'
          );
        }
        return;
      }
      const cola = mensaje.colaActualizada as ColaServidorDTO | undefined;
      if (cola && Array.isArray(cola.sesionesActivas)) {
        this.aplicarColaServidor(cola);
      }
    });
  }

  /**
   * Carga la cola real de la atracción desde el backend (GET /operacion/cola/{id}).
   */
  sincronizarColaDesdeServidor(atraccionId: number | string): void {
    this.http.get<ColaServidorDTO>(`${this.apiUrl}/cola/${atraccionId}`).pipe(
      catchError(() => of(null))
    ).subscribe(cola => {
      if (String(this.estacionActiva()?.atraccionId) !== String(atraccionId)) {
        return;
      }
      if (cola && Array.isArray(cola.sesionesActivas)) {
        this.aplicarColaServidor(cola);
      }
    });
  }

  private aplicarColaServidor(cola: ColaServidorDTO): void {
    const actual = this.colaActiva();
    const servidor = (cola.sesionesActivas ?? []).map(dto => {
      const ticketUuid = String(dto.ticketUuid ?? '');
      const previa = actual.find(s => s.ticketUuid === ticketUuid || s.idSesion === String(dto.sesionId));
      return this.mapearSesionServidor(dto, previa);
    });
    const ticketsServidor = new Set(servidor.map(s => s.ticketUuid));
    // Conservar inicios locales aún no confirmados por el backend
    const pendientesLocales = actual.filter(
      s => this.accionesPendientesPorSesionLocal.has(s.idSesion) && !ticketsServidor.has(s.ticketUuid)
    );
    this.colaActiva.set([...pendientesLocales, ...servidor]);
  }

  private mapearSesionServidor(dto: SesionServidorDTO, previa?: SesionJuegoMenor): SesionJuegoMenor {
    const enPausa = dto.estadoSesion === 'PAUSADA';
    const restantes = enPausa ? (dto.tiempoRestantePausa ?? dto.segundosRestantes ?? 0) : (dto.segundosRestantes ?? 0);
    const duracion = dto.duracionSegundos ?? previa?.duracionTotalSegundos ?? restantes;
    const nowServerMs = this.wsService.obtenerTiempoServidorActual();
    return {
      ...(previa ?? {}),
      idSesion: String(dto.sesionId),
      ticketUuid: String(dto.ticketUuid ?? previa?.ticketUuid ?? ''),
      codigoBoleta: previa?.codigoBoleta ?? String(dto.ticketUuid ?? ''),
      atraccionId: dto.atraccionId ?? previa?.atraccionId ?? this.estacionActiva()?.atraccionId ?? 1,
      tipoAtraccion: previa?.tipoAtraccion ?? this.estacionActiva()?.tipoAtraccion ?? 'TEMPORIZADA',
      menorNombre: dto.menorNombre ?? previa?.menorNombre ?? 'Menor en Juego',
      menorEdad: dto.menorEdad ?? previa?.menorEdad,
      acudienteNombre: dto.acudienteNombre ?? previa?.acudienteNombre ?? 'Acudiente',
      acudienteTelefono: dto.acudienteTelefono ?? previa?.acudienteTelefono,
      horaInicio: previa?.horaInicio ?? new Date(nowServerMs - (duracion - restantes) * 1000).toISOString(),
      horaFin: enPausa
        ? (previa?.horaFin ?? new Date(nowServerMs + restantes * 1000).toISOString())
        : new Date(nowServerMs + restantes * 1000).toISOString(),
      duracionTotalSegundos: duracion,
      segundosRestantes: restantes,
      segundosExcedidos: previa?.segundosExcedidos ?? dto.segundosExceso ?? 0,
      estadoSemaforo: enPausa ? 'PAUSADO' : (previa?.estadoSemaforo ?? 'VERDE'),
      enPausa,
      segundosCongelados: enPausa ? restantes : undefined,
      intentosMaximos: dto.intentosTotales ?? previa?.intentosMaximos,
      intentosRealizados: dto.intentosTotales != null && dto.intentosRestantes != null
        ? dto.intentosTotales - dto.intentosRestantes
        : previa?.intentosRealizados
    };
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
  private readonly accionesPendientesPorSesionLocal = new Map<string, Array<(idServidor: string) => void>>();

  private esIdSesionLocal(idSesion: string): boolean {
    return idSesion.startsWith('ses_');
  }

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

    // Si la sesión aún tiene id local (inicio pendiente de respuesta), diferir hasta conocer el id del servidor
    if (tipo !== 'INICIAR_SESION' && idSesion && this.accionesPendientesPorSesionLocal.has(idSesion)) {
      const pendientes = this.accionesPendientesPorSesionLocal.get(idSesion)!;
      pendientes.push(idServidor =>
        this.despacharEventoOperativo(
          tipo,
          endpoint.replace(idSesion, idServidor),
          { ...payload, idSesion: idServidor },
          idServidor,
          ticketUuid
        )
      );
      this.accionesPendientesPorSesionLocal.set(idSesion, pendientes);
      return;
    }

    if (tipo === 'INICIAR_SESION' && idSesion && this.esIdSesionLocal(idSesion)) {
      this.accionesPendientesPorSesionLocal.set(idSesion, []);
    }

    this.http.post<{ id?: number | string; sesionId?: number | string }>(`${this.apiUrl}/${endpoint}`, { atraccionId, idSesion, ticketUuid, ...payload }).pipe(
      tap(res => {
        const idRemoto = res?.sesionId ?? res?.id;
        if (tipo === 'INICIAR_SESION' && idSesion) {
          const idServidor = idRemoto != null ? String(idRemoto) : idSesion;
          if (idServidor !== idSesion) {
            this.colaActiva.update(cola =>
              cola.map(s => (s.idSesion === idSesion ? { ...s, idSesion: idServidor } : s))
            );
          }
          const pendientes = this.accionesPendientesPorSesionLocal.get(idSesion) ?? [];
          this.accionesPendientesPorSesionLocal.delete(idSesion);
          pendientes.forEach(accion => accion(idServidor));
        }
      }),
      catchError((err: unknown) => {
        if (tipo === 'INICIAR_SESION' && idSesion) {
          this.accionesPendientesPorSesionLocal.delete(idSesion);
        }
        if (err instanceof HttpErrorResponse && err.status === 0) {
          this.offlineQueue.encolarAccion(tipo, atraccionId, payload, idSesion, ticketUuid);
        } else {
          const detalle = err instanceof HttpErrorResponse ? (err.error?.message ?? err.message) : '';
          this.notificationService.error(
            `El servidor rechazó la acción ${tipo}. ${detalle}`.trim(),
            'Error de sincronización'
          );
        }
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Consulta todas las atracciones activas del parque y las asignaciones del operario (HU-24).
   */
  consultarEstacionAsignada(): Observable<EstacionTrabajo[]> {
    let atraccionesFallo = false;
    let asignacionesFallo = false;

    return forkJoin({
      atracciones: this.atraccionService.getActivas().pipe(
        catchError(() => {
          atraccionesFallo = true;
          return of([]);
        })
      ),
      asignaciones: this.asignacionService.getActiveAssignments().pipe(
        catchError(() => {
          asignacionesFallo = true;
          return of([]);
        })
      )
    }).pipe(
      switchMap(({ atracciones, asignaciones }) => {
        if (atraccionesFallo && asignacionesFallo) {
          return this.consultarEstacionActivaFallback();
        }
        return of(this.procesarEstacionesDisponibles(atracciones, asignaciones));
      }),
      catchError(() => this.consultarEstacionActivaFallback())
    );
  }

  private procesarEstacionesDisponibles(
    atracciones: Awaited<ReturnType<AtraccionService['getActivas']>> extends Observable<infer T> ? T : never,
    asignaciones: Awaited<ReturnType<AsignacionService['getActiveAssignments']>> extends Observable<infer U> ? U : never
  ): EstacionTrabajo[] {
    const currentUser = this.authService.currentUser();
    const userId = currentUser?.id;
    const tieneAccesoLibre = currentUser?.rol === 'COORDINADOR' || currentUser?.rol === 'ADMINISTRADOR';

    let mapeadas: EstacionTrabajo[] = [];

    if (atracciones && atracciones.length > 0) {
      mapeadas = atracciones.map(a => {
        const asigAtraccion = asignaciones.find(
          asig => String(asig.atraccionId) === String(a.id) && asig.activo
        );
        const esMio = asigAtraccion
          ? String(asigAtraccion.operarioId ?? (asigAtraccion as { usuarioId?: number | string }).usuarioId) === String(userId)
          : false;
        const ocupadaPorOtroReal = asigAtraccion ? !esMio : false;
        const ocupadaPorOtro = tieneAccesoLibre ? false : ocupadaPorOtroReal;
        const nombreOtro = ocupadaPorOtroReal ? asigAtraccion?.operarioNombre : undefined;
        const esEventoCaidas = a.tipo === 'EVENTOS_CAIDAS';

        return {
          idAsignacion: asigAtraccion?.id || a.id || 1,
          atraccionId: a.id!,
          atraccionNombre: a.nombre,
          tipoAtraccion: esEventoCaidas ? 'EVENTOS_CAIDAS' : 'TEMPORIZADA',
          capacidadMaxima: a.capacidadMaxima ?? 12,
          ocupacionActual: a.ocupacionActiva ?? 0,
          duracionMinutosBase: a.duracionMinutosBase ?? 15,
          toleranciaMinutos: a.toleranciaMinutos ?? 2,
          caidasMaximas: a.caidasLimite ?? 3,
          edadMinima: a.edadMinima ?? 3,
          edadMaxima: a.edadMaxima ?? 12,
          operarioId: asigAtraccion?.operarioId ?? (userId || 1),
          operarioNombre: esMio
            ? (asigAtraccion?.operarioNombre || this.authService.currentUserName())
            : (nombreOtro || this.authService.currentUserName()),
          confirmada: false,
          estadoEnlace: this.wsService.estadoConexion(),
          ocupadaPorOtroOperario: ocupadaPorOtro,
          nombreOtroOperario: nombreOtro,
          esMiEstacion: esMio
        };
      });
    } else if (asignaciones && asignaciones.length > 0) {
      // Fallback a asignaciones si no hay lista de atracciones
      mapeadas = asignaciones.map(asig => {
        const esMio = String(asig.operarioId ?? (asig as { usuarioId?: number | string }).usuarioId) === String(userId);
        const ocupadaPorOtroReal = !esMio;
        return {
          idAsignacion: asig.id || 1,
          atraccionId: asig.atraccionId,
          atraccionNombre: asig.atraccionNombre || 'Atracción Asignada',
          tipoAtraccion: (asig as { tipoAtraccion?: string }).tipoAtraccion === 'EVENTOS_CAIDAS' ? 'EVENTOS_CAIDAS' : 'TEMPORIZADA',
          capacidadMaxima: (asig as { capacidadMaxima?: number }).capacidadMaxima ?? 12,
          ocupacionActual: 0,
          duracionMinutosBase: (asig as { duracionMinutosBase?: number }).duracionMinutosBase ?? 15,
          toleranciaMinutos: (asig as { toleranciaMinutos?: number }).toleranciaMinutos ?? 2,
          caidasMaximas: (asig as { caidasLimite?: number }).caidasLimite ?? 3,
          edadMinima: (asig as { edadMinima?: number }).edadMinima ?? 3,
          edadMaxima: (asig as { edadMaxima?: number }).edadMaxima ?? 12,
          operarioId: asig.operarioId,
          operarioNombre: asig.operarioNombre || this.authService.currentUserName(),
          confirmada: false,
          estadoEnlace: this.wsService.estadoConexion(),
          ocupadaPorOtroOperario: tieneAccesoLibre ? false : ocupadaPorOtroReal,
          nombreOtroOperario: ocupadaPorOtroReal ? asig.operarioNombre : undefined,
          esMiEstacion: esMio
        };
      });
    }

    this.estacionesDisponibles.set(mapeadas);

    const estacionPrevia = this.estacionActiva();
    if (mapeadas.length === 0) {
      this.estacionActiva.set(null);
      if (typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.removeItem(this.STORAGE_ESTACION_KEY);
        } catch {
          // Ignorar
        }
      }
      return [];
    }

    // Preseleccionar: primero la que esté asignada a este operario, o la primera libre
    const miEstacion = mapeadas.find(m => m.esMiEstacion);
    const primeraLibre = mapeadas.find(m => !m.ocupadaPorOtroOperario);
    const seleccionada = miEstacion || primeraLibre || mapeadas[0];

    if (seleccionada) {
      const mantenerConfirmada =
        !!estacionPrevia?.confirmada &&
        String(estacionPrevia.atraccionId) === String(seleccionada.atraccionId) &&
        estacionPrevia.atraccionNombre === seleccionada.atraccionNombre;

      const actualizada: EstacionTrabajo = {
        ...seleccionada,
        confirmada: mantenerConfirmada,
        fechaConfirmacion: mantenerConfirmada ? estacionPrevia?.fechaConfirmacion : undefined
      };
      this.estacionActiva.set(actualizada);
      if (mantenerConfirmada) {
        this.guardarEstacionEnStorage(actualizada);
      }
    }

    return this.estacionesDisponibles();
  }

  private consultarEstacionActivaFallback(): Observable<EstacionTrabajo[]> {
    return this.http.get<{
      asignacionId?: number | string;
      operarioId?: number | string;
      operarioNombre?: string;
      atraccionId: number | string;
      atraccionNombre: string;
      tipoAtraccion?: string;
      capacidadMaxima?: number;
      aforoActual?: number;
      duracionMinutosBase?: number;
      toleranciaMinutos?: number;
      caidasLimite?: number;
      edadMinima?: number;
      edadMaxima?: number;
    }>(`${environment.apiUrl}/operario/estacion-activa`).pipe(
      map(dto => {
        const esEvento = dto.tipoAtraccion === 'EVENTOS_CAIDAS' || dto.tipoAtraccion === 'EVENTO';
        const estacion: EstacionTrabajo = {
          idAsignacion: dto.asignacionId ?? 1,
          atraccionId: dto.atraccionId,
          atraccionNombre: dto.atraccionNombre,
          tipoAtraccion: esEvento ? 'EVENTOS_CAIDAS' : 'TEMPORIZADA',
          capacidadMaxima: dto.capacidadMaxima ?? 12,
          ocupacionActual: dto.aforoActual ?? 0,
          duracionMinutosBase: dto.duracionMinutosBase ?? 15,
          toleranciaMinutos: dto.toleranciaMinutos ?? 2,
          caidasMaximas: dto.caidasLimite ?? 3,
          edadMinima: dto.edadMinima ?? 3,
          edadMaxima: dto.edadMaxima ?? 12,
          operarioId: dto.operarioId ?? (this.authService.currentUser()?.id || 1),
          operarioNombre: dto.operarioNombre || this.authService.currentUserName(),
          confirmada: false,
          estadoEnlace: this.wsService.estadoConexion(),
          ocupadaPorOtroOperario: false,
          esMiEstacion: true
        };
        this.estacionesDisponibles.set([estacion]);
        this.estacionActiva.set(estacion);
        return [estacion];
      }),
      catchError(() => {
        this.estacionesDisponibles.set([]);
        this.estacionActiva.set(null);
        return of([]);
      })
    );
  }

  /**
   * Confirma la estación tras validación en backend e inicia labores en campo habilitando el escáner (HU-24.06, HU-24.07).
   */
  confirmarEstacionTrabajo(estacion: EstacionTrabajo): Observable<boolean> {
    if (estacion.ocupadaPorOtroOperario) {
      this.notificationService.error(
        `La atracción ${estacion.atraccionNombre} ya está atendida por ${estacion.nombreOtroOperario || 'otro operario'}.`
      );
      return of(false);
    }

    return this.http.post<{
      asignacionId?: number | string;
      operarioId?: number | string;
      operarioNombre?: string;
    }>(`${this.apiUrl}/vincular`, {
      atraccionId: estacion.atraccionId
    }).pipe(
      map(res => {
        const confirmada: EstacionTrabajo = {
          ...estacion,
          idAsignacion: res?.asignacionId ?? estacion.idAsignacion,
          operarioId: res?.operarioId ?? estacion.operarioId,
          operarioNombre: res?.operarioNombre ?? estacion.operarioNombre,
          confirmada: true,
          fechaConfirmacion: new Date().toISOString()
        };
        this.estacionActiva.set(confirmada);
        this.guardarEstacionEnStorage(confirmada);

        this.wsService.conectarEstacion(confirmada.atraccionId);
        this.sincronizarColaDesdeServidor(confirmada.atraccionId);
        this.notificationService.success(`Estación ${confirmada.atraccionNombre} confirmada`, 'Labores Iniciadas');
        return true;
      }),
      catchError((err: HttpErrorResponse) => {
        const detalle = err.error?.detalles || err.error?.mensaje || err.error?.message ||
          `No se pudo vincular la estación ${estacion.atraccionNombre}.`;
        this.notificationService.error(detalle, 'Estación no disponible');
        this.consultarEstacionAsignada().subscribe();
        return of(false);
      })
    );
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

    // 3. Consulta al backend (POST /api/operacion/escanear) con distinción estricta entre rechazo HTTP y modo offline
    return this.http.post<ResultadoValidacionQr & {
      valido?: boolean;
      uuidTicket?: string;
      mensaje?: string;
      minutosAutorizados?: number;
      intentosAutorizados?: number;
    }>(`${this.apiUrl}/escanear`, {
      uuid: codigoLimpio,
      atraccionId: estacion?.atraccionId ?? 1,
      timestamp: new Date().toISOString()
    }).pipe(
      map(raw => {
        const res: ResultadoValidacionQr = {
          ...raw,
          aprobado: raw.aprobado ?? raw.valido ?? false,
          uuid: raw.uuid || raw.uuidTicket || codigoLimpio,
          mensajeExplicativo: raw.mensajeExplicativo || raw.mensaje || 'Boleto procesado.',
          duracionMinutos: raw.duracionMinutos ?? raw.minutosAutorizados,
          caidasPermitidas: raw.caidasPermitidas ?? raw.intentosAutorizados
        };
        return res;
      }),
      tap(res => {
        this.resultadoValidacionActual.set(res);
        if (res.aprobado) {
          this.soundService.reproducirBeepEscaneo();
        }
      }),
      catchError((error: HttpErrorResponse) => {
        // Rechazo seguro ante errores de cliente (400..499)
        if (error.status >= 400 && error.status < 500) {
          let causa: CausaRechazoTicket = error.error?.causaRechazo;
          const msg = (
            error.error?.detalles ||
            error.error?.mensaje ||
            error.error?.message ||
            error.error?.mensajeExplicativo ||
            ''
          ).toString();
          const lowerMsg = msg.toLowerCase();

          if (!causa) {
            if (error.status === 400 || lowerMsg.includes('json') || lowerMsg.includes('formato')) {
              causa = 'FORMATO_QR_INVALIDO';
            } else if (error.status === 404 || lowerMsg.includes('no encontrado') || lowerMsg.includes('inexistente')) {
              causa = 'BOLETO_NO_ENCONTRADO';
            } else if (error.status === 409) {
              causa = lowerMsg.includes('aforo') ? 'AFORO_COMPLETO' : 'BOLETO_YA_CONSUMIDO';
            } else if (error.status === 422) {
              causa = (lowerMsg.includes('edad') || lowerMsg.includes('años')) ? 'EDAD_FUERA_RANGO' : 'ATRACCION_INCORRECTA';
            } else {
              causa = 'BOLETO_NO_ENCONTRADO';
            }
          }

          const rechazoServidor: ResultadoValidacionQr = {
            aprobado: false,
            uuid: codigoLimpio,
            causaRechazo: causa,
            mensajeExplicativo:
              causa === 'FORMATO_QR_INVALIDO' && lowerMsg.includes('json')
                ? 'El código escaneado no tiene un formato válido de UUID o ticket.'
                : (msg || 'El boleto fue rechazado o no existe en el servidor.')
          };
          this.resultadoValidacionActual.set(rechazoServidor);
          return of(rechazoServidor);
        }

        // Fail-Closed también sin conexión o ante errores 5xx: nunca aprobar boletos sin validación del servidor
        if (error.status === 0) {
          const rechazoSinRed: ResultadoValidacionQr = {
            aprobado: false,
            uuid: codigoLimpio,
            causaRechazo: 'SIN_CONEXION',
            mensajeExplicativo: 'Sin conexión con el servidor. No es posible validar el boleto en este momento.'
          };
          this.resultadoValidacionActual.set(rechazoSinRed);
          return of(rechazoSinRed);
        }

        const rechazoErrorServidor: ResultadoValidacionQr = {
          aprobado: false,
          uuid: codigoLimpio,
          causaRechazo: 'ERROR_SERVIDOR',
          mensajeExplicativo: 'Error del servidor al validar el boleto. Intente nuevamente.'
        };
        this.resultadoValidacionActual.set(rechazoErrorServidor);
        return of(rechazoErrorServidor);
      })
    );
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

    this.despacharEventoOperativo('INICIAR_SESION', 'iniciar-sesion', { sesion: nuevaSesion }, nuevaSesion.idSesion, nuevaSesion.ticketUuid);

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

    this.despacharEventoOperativo('PAUSAR_SESION', `sesiones/${idSesion}/pausar`, { idSesion, motivo }, idSesion);
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

    this.despacharEventoOperativo('REANUDAR_SESION', `sesiones/${idSesion}/reanudar`, { idSesion }, idSesion);
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

    const atraccionId = this.estacionActiva()?.atraccionId || 1;
    this.despacharEventoOperativo('PARADA_EMERGENCIA', `atraccion/${atraccionId}/pausa-general`, { motivo });
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
      this.colaActiva.update(cola => cola.filter(s => s.idSesion !== idSesion && s.ticketUuid !== sesion.ticketUuid));
      this.modalAforoCompletoAbierto.set(false);
      this.notificationService.info(`Salida confirmada para ${sesion.menorNombre}. Cupo liberado.`);
    }, 300);
    this.salidasTimers.set(idSesion, timer);

    // 4. Notificar o encolar offline
    this.despacharEventoOperativo(
      'CONFIRMAR_SALIDA',
      `sesiones/${idSesion}/salida`,
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
      `sesiones/${idSesion}/descontar-intento`,
      { idSesion, segundosRonda },
      idSesion
    );
  }

  autorizarIngresoForzadoSupervisor(clave?: string): Observable<boolean> {
    const pin = (clave || '').trim();
    if (!pin) {
      this.notificationService.error('Se requiere ingresar el PIN de supervisor.');
      return of(false);
    }

    const atraccionId = this.estacionActiva()?.atraccionId;
    if (!atraccionId) {
      this.notificationService.error('No hay una estación de trabajo activa seleccionada.');
      return of(false);
    }

    return this.http.post<void>(`${this.apiUrl}/autorizar-sobreaforo`, {
      atraccionId,
      claveSupervisor: pin,
      motivo: 'Override de capacidad máxima autorizado por supervisor'
    }).pipe(
      map(() => {
        this.ingresoForzadoSupervisor.set(true);
        this.modalAforoCompletoAbierto.set(false);
        this.notificationService.warn('Ingreso forzado autorizado por supervisor/administrador');
        return true;
      }),
      catchError((err: unknown) => {
        this.ingresoForzadoSupervisor.set(false);
        const detalle = err instanceof HttpErrorResponse
          ? (err.error?.detalles || err.error?.mensaje || err.error?.message || 'PIN o credencial de supervisor inválida.')
          : 'PIN o credencial de supervisor inválida.';
        this.notificationService.error(detalle, 'Autorización denegada');
        return of(false);
      })
    );
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
        const currentUserId = this.authService.currentUser()?.id;
        if (currentUserId && estacion.operarioId && String(estacion.operarioId) !== String(currentUserId)) {
          sessionStorage.removeItem(this.STORAGE_ESTACION_KEY);
          return;
        }
        this.estacionActiva.set(estacion);
        if (estacion.confirmada) {
          this.wsService.conectarEstacion(estacion.atraccionId);
          this.sincronizarColaDesdeServidor(estacion.atraccionId);
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

  ngOnDestroy(): void {
    this.salidasTimers.forEach(timer => clearTimeout(timer));
    this.salidasTimers.clear();
  }
}
