import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { EstadoEnlaceOperario } from '../models/operador.model';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { Observable, Subject } from 'rxjs';
import { Client, StompSubscription } from '@stomp/stompjs';

export interface OccupancyEvent {
  atraccionId: number | string;
  ninosActivos: number;
  operarioNombre?: string;
  capacidadMaxima?: number;
}

export interface MensajeEstacionWs {
  tipo: 'ACTUALIZACION_COLA' | 'PAUSA_GENERAL' | 'SINCRONIZACION_RELOJ' | 'SALIDA_MENOR' | 'ALERTA_AFORO';
  atraccionId: number | string;
  serverTimestamp?: string | number;
  payload: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService, { optional: true });

  // Telemetría de Ocupación para Admin Dashboard (HU-11)
  private occupancySubject = new Subject<OccupancyEvent>();
  public readonly occupancy$: Observable<OccupancyEvent> = this.occupancySubject.asObservable();
  readonly connected = signal<boolean>(true);

  // Estado del Operario en Campo (HU-27, HU-35)
  readonly estadoConexion = signal<EstadoEnlaceOperario>('CONECTADO');
  readonly serverTimeOffsetMs = signal<number>(0);
  readonly reintentosReconexion = signal<number>(0);
  readonly ultimoMensajeRecibido = signal<MensajeEstacionWs | null>(null);

  private stompClient: Client | null = null;
  private canalSuscripcion: StompSubscription | null = null;
  private readonly mensajesSubject = new Subject<MensajeEstacionWs>();
  private atraccionIdActiva: number | string | null = null;
  private reconexionTimer: ReturnType<typeof setTimeout> | null = null;
  private deshabilitarConexionReal = false; // Flag para pruebas unitarias / entornos mock

  constructor() {
    this.iniciarListenersConectividad();
  }

  ngOnDestroy(): void {
    this.desconectar();
    this.removerListenersConectividad();
  }

  /**
   * Emite eventos de telemetría de ocupación para Dashboard y vistas administrativas.
   */
  emitOccupancyEvent(event: OccupancyEvent): void {
    this.occupancySubject.next(event);
  }

  setConnected(status: boolean): void {
    this.connected.set(status);
    this.estadoConexion.set(status ? 'CONECTADO' : 'SIN_CONEXION');
  }

  /**
   * Conecta y suscribe reactivamente a los tópicos de la estación de trabajo (HU-27.07 / SCRUM-411).
   */
  conectarEstacion(atraccionId: number | string): Observable<MensajeEstacionWs> {
    this.atraccionIdActiva = atraccionId;
    this.limpiarReconexionTimer();

    if (this.deshabilitarConexionReal || typeof window === 'undefined') {
      this.estadoConexion.set('CONECTADO');
      return this.mensajesSubject.asObservable();
    }

    try {
      if (!this.stompClient) {
        const brokerURL = this.construirBrokerUrl();
        const token = this.authService?.getToken?.();
        const connectHeaders: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        this.stompClient = new Client({
          brokerURL,
          connectHeaders,
          reconnectDelay: 0,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          onConnect: () => {
            const eraReconexion = this.reintentosReconexion() > 0 || this.estadoConexion() === 'RECONECTANDO';
            this.estadoConexion.set('CONECTADO');
            this.connected.set(true);
            this.reintentosReconexion.set(0);
            this.suscribirTopico();
            if (eraReconexion) {
              this.notificationService.success('Reconectado con éxito', 'Conexión Restablecida');
            }
          },
          onDisconnect: () => {
            this.iniciarReconexionConBackoff();
          },
          onStompError: () => {
            this.iniciarReconexionConBackoff();
          },
          onWebSocketClose: () => {
            this.iniciarReconexionConBackoff();
          }
        });

        this.stompClient.activate();
      } else if (this.stompClient.connected) {
        this.suscribirTopico();
      }
    } catch {
      this.iniciarReconexionConBackoff();
    }

    return this.mensajesSubject.asObservable();
  }

  private suscribirTopico(): void {
    if (!this.stompClient || !this.stompClient.connected || !this.atraccionIdActiva) return;

    this.canalSuscripcion?.unsubscribe();
    const topico = `/topic/estacion/${this.atraccionIdActiva}`;

    this.canalSuscripcion = this.stompClient.subscribe(topico, message => {
      try {
        const parsed = JSON.parse(message.body) as MensajeEstacionWs;
        if (parsed.serverTimestamp) {
          this.sincronizarRelojServidor(parsed.serverTimestamp);
        }
        this.ultimoMensajeRecibido.set(parsed);
        this.mensajesSubject.next(parsed);
      } catch {
        // Error de parseo JSON
      }
    });
  }

  /**
   * Sincroniza el desfase de tiempo contra la marca del servidor (HU-27.09, HU-35.05 / RNF8).
   * serverTimeOffsetMs = serverTimestamp - localTimestamp.
   */
  sincronizarRelojServidor(serverTimestampIsoOrMs: string | number): number {
    const serverMs = typeof serverTimestampIsoOrMs === 'string'
      ? Date.parse(serverTimestampIsoOrMs)
      : serverTimestampIsoOrMs;

    if (!isNaN(serverMs)) {
      const nowLocal = Date.now();
      const offset = serverMs - nowLocal;
      this.serverTimeOffsetMs.set(offset);
      return offset;
    }
    return this.serverTimeOffsetMs();
  }

  /**
   * Retorna el timestamp actual sincronizado con el reloj del servidor.
   */
  obtenerTiempoServidorActual(): number {
    return Date.now() + this.serverTimeOffsetMs();
  }

  /**
   * Emite un mensaje manualmente para pruebas o simulación local.
   */
  emitirMensajeLocal(mensaje: MensajeEstacionWs): void {
    if (mensaje.serverTimestamp) {
      this.sincronizarRelojServidor(mensaje.serverTimestamp);
    }
    this.ultimoMensajeRecibido.set(mensaje);
    this.mensajesSubject.next(mensaje);
  }

  private construirBrokerUrl(): string {
    const api = environment.apiUrl || '';
    if (api.startsWith('http://') || api.startsWith('https://')) {
      const wsBase = api.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
      return `${wsBase}/ws/websocket`;
    }
    const loc = window.location;
    const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = loc.host || 'localhost:8080';
    return `${proto}//${host}/territorioninos/ws/websocket`;
  }

  /**
   * Algoritmo de reconexión con backoff exponencial: 2s, 4s, 8s (HU-35.03).
   */
  iniciarReconexionConBackoff(): void {
    if (this.reconexionTimer !== null) {
      return;
    }

    const intento = this.reintentosReconexion() + 1;
    if (intento > 5) {
      this.estadoConexion.set('SIN_CONEXION');
      this.connected.set(false);
      return;
    }

    this.estadoConexion.set('RECONECTANDO');
    this.connected.set(false);
    this.reintentosReconexion.set(intento);

    const exponente = Math.min(intento - 1, 2);
    const delayMs = 2000 * Math.pow(2, exponente); // 2000, 4000, 8000

    this.reconexionTimer = setTimeout(() => {
      this.reconexionTimer = null;
      if (this.atraccionIdActiva && typeof navigator !== 'undefined' && navigator.onLine) {
        this.reintentarConexion();
      } else {
        this.estadoConexion.set('SIN_CONEXION');
        this.connected.set(false);
      }
    }, delayMs);
  }

  private reintentarConexion(): void {
    if (!this.atraccionIdActiva) return;

    if (this.stompClient) {
      try {
        this.stompClient.deactivate();
        this.stompClient = null;
      } catch {
        // Ignorar
      }
    }

    this.conectarEstacion(this.atraccionIdActiva);
  }

  desconectar(): void {
    this.limpiarReconexionTimer();
    this.canalSuscripcion?.unsubscribe();
    this.canalSuscripcion = null;

    if (this.stompClient) {
      try {
        this.stompClient.deactivate();
      } catch {
        // Ignorar
      }
      this.stompClient = null;
    }

    this.atraccionIdActiva = null;
    this.estadoConexion.set('SIN_CONEXION');
    this.connected.set(false);
  }

  setDeshabilitarConexionReal(deshabilitar: boolean): void {
    this.deshabilitarConexionReal = deshabilitar;
  }

  private limpiarReconexionTimer(): void {
    if (this.reconexionTimer) {
      clearTimeout(this.reconexionTimer);
      this.reconexionTimer = null;
    }
  }

  private readonly handleOnline = () => {
    if (this.atraccionIdActiva) {
      this.reintentarConexion();
    } else {
      this.estadoConexion.set('CONECTADO');
      this.connected.set(true);
    }
  };

  private readonly handleOffline = () => {
    this.estadoConexion.set('SIN_CONEXION');
    this.connected.set(false);
  };

  private iniciarListenersConectividad(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private removerListenersConectividad(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}
