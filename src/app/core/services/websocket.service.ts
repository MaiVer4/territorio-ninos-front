import { Injectable, inject, signal, OnDestroy, InjectionToken } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { EstadoEnlaceOperario } from '../models/operador.model';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { Observable, Subject } from 'rxjs';
import { Client, StompSubscription, IMessage } from '@stomp/stompjs';

export interface OccupancyEvent {
  atraccionId: number | string;
  ninosActivos: number;
  operarioNombre?: string;
  capacidadMaxima?: number;
}

export interface MensajeEstacionWs {
  tipo:
    | 'ACTUALIZACION_COLA'
    | 'PAUSA_GENERAL'
    | 'SINCRONIZACION_RELOJ'
    | 'SALIDA_MENOR'
    | 'ALERTA_AFORO'
    | 'NUEVO_INGRESO'
    | 'PAUSA'
    | 'REANUDACION'
    | 'ALERTA_PRE_EXPIRACION'
    | 'TIEMPO_EXPIRADO'
    | 'SESION_FINALIZADA';
  atraccionId: number | string;
  sesionId?: number | string | null;
  mensaje?: string;
  serverTimestamp?: string | number;
  timestamp?: string | number;
  payload?: unknown;
  colaActualizada?: unknown;
  sesion?: unknown;
}

/**
 * Token de inyección para la factoría de clientes STOMP (DIP - Dependency Inversion Principle).
 */
export const STOMP_CLIENT_FACTORY = new InjectionToken<() => Client>('STOMP_CLIENT_FACTORY', {
  providedIn: 'root',
  factory: () => () => new Client()
});

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService, { optional: true });
  private readonly stompFactory = inject(STOMP_CLIENT_FACTORY);

  // Telemetría de Ocupación para Admin Dashboard (HU-11)
  private readonly occupancySubject = new Subject<OccupancyEvent>();
  public readonly occupancy$: Observable<OccupancyEvent> = this.occupancySubject.asObservable();
  readonly connected = signal<boolean>(true);

  // Estado del Operario en Campo (HU-27, HU-35)
  readonly estadoConexion = signal<EstadoEnlaceOperario>('CONECTADO');
  readonly serverTimeOffsetMs = signal<number>(0);
  readonly reintentosReconexion = signal<number>(0);
  readonly ultimoMensajeRecibido = signal<MensajeEstacionWs | null>(null);

  private stompClient: Client | null = null;
  private canalSuscripcion: StompSubscription | null = null;
  private canalDashboardSuscripcion: StompSubscription | null = null;
  private dashboardAdminActivo = false;
  private readonly mensajesSubject = new Subject<MensajeEstacionWs>();
  private atraccionIdActiva: number | string | null = null;
  private reconexionTimer: ReturnType<typeof setTimeout> | null = null;
  private deshabilitarConexionReal = false;
  private listenersIniciados = false;

  constructor() {
    this.iniciarListenersConectividad();
  }

  ngOnDestroy(): void {
    this.desconectar();
    this.removerListenersConectividad();
    this.occupancySubject.complete();
    this.mensajesSubject.complete();
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

    if (this.deshabilitarConexionReal || !this.isWindowAvailable()) {
      this.estadoConexion.set('CONECTADO');
      return this.mensajesSubject.asObservable();
    }

    this.asegurarClienteStompConectado();
    return this.mensajesSubject.asObservable();
  }

  /**
   * Conecta y suscribe reactivamente al canal de telemetría administrativa `/topic/admin/dashboard` (HU-11).
   */
  conectarDashboardAdmin(): Observable<OccupancyEvent> {
    this.dashboardAdminActivo = true;
    if (!this.deshabilitarConexionReal && this.isWindowAvailable()) {
      if (this.stompClient?.connected) {
        this.suscribirTopicoDashboard();
      } else {
        this.asegurarClienteStompConectado();
      }
    }
    return this.occupancy$;
  }

  /**
   * Sincroniza el desfase de tiempo contra la marca del servidor (HU-27.09, HU-35.05 / RNF8).
   * serverTimeOffsetMs = serverTimestamp - localTimestamp.
   */
  sincronizarRelojServidor(serverTimestampIsoOrMs: string | number): number {
    const serverMs = typeof serverTimestampIsoOrMs === 'string'
      ? Date.parse(serverTimestampIsoOrMs)
      : Number(serverTimestampIsoOrMs);

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
    const timestampServidor = mensaje.serverTimestamp ?? mensaje.timestamp;
    if (timestampServidor !== undefined && timestampServidor !== null) {
      this.sincronizarRelojServidor(timestampServidor);
    }
    this.ultimoMensajeRecibido.set(mensaje);
    this.mensajesSubject.next(mensaje);
  }

  /**
   * Construye la URL canónica del broker WebSocket alineada con Spring Boot (`/ws-operacion/websocket`).
   */
  construirBrokerUrl(): string {
    const api = environment.apiUrl || '';
    if (api.startsWith('http://') || api.startsWith('https://')) {
      const wsBase = api.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
      return `${wsBase}/ws-operacion/websocket`;
    }
    const loc = this.document?.defaultView?.location;
    const proto = loc?.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = loc?.host || 'localhost:8080';
    return `${proto}//${host}/territorioninos/ws-operacion/websocket`;
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

  desconectar(): void {
    this.limpiarReconexionTimer();
    this.canalSuscripcion?.unsubscribe();
    this.canalSuscripcion = null;
    this.canalDashboardSuscripcion?.unsubscribe();
    this.canalDashboardSuscripcion = null;
    this.dashboardAdminActivo = false;

    if (this.stompClient) {
      try {
        this.stompClient.deactivate();
      } catch {
        // Ignorar errores al desactivar cliente STOMP
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

  // ==========================================
  // MÉTODOS PRIVADOS DE GESTIÓN STOMP (SRP)
  // ==========================================

  private asegurarClienteStompConectado(): void {
    try {
      if (!this.stompClient) {
        const client = this.stompFactory();
        client.configure({
          brokerURL: this.construirBrokerUrl(),
          connectHeaders: this.construirCabecerasAutenticacion(),
          reconnectDelay: 0,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          beforeConnect: () => {
            client.connectHeaders = this.construirCabecerasAutenticacion();
          },
          onConnect: () => {
            const eraReconexion = this.reintentosReconexion() > 0 || this.estadoConexion() === 'RECONECTANDO';
            this.estadoConexion.set('CONECTADO');
            this.connected.set(true);
            this.reintentosReconexion.set(0);
            this.suscribirTopico();
            if (this.dashboardAdminActivo) {
              this.suscribirTopicoDashboard();
            }
            if (eraReconexion) {
              this.notificationService.success('Reconectado con éxito', 'Conexión Restablecida');
            }
          },
          onDisconnect: () => this.iniciarReconexionConBackoff(),
          onStompError: () => this.iniciarReconexionConBackoff(),
          onWebSocketClose: () => this.iniciarReconexionConBackoff()
        });

        this.stompClient = client;
        this.stompClient.activate();
      } else if (this.stompClient.connected) {
        this.suscribirTopico();
        if (this.dashboardAdminActivo) {
          this.suscribirTopicoDashboard();
        }
      }
    } catch {
      this.iniciarReconexionConBackoff();
    }
  }

  private construirCabecerasAutenticacion(): Record<string, string> {
    const token = this.authService?.getToken?.();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private suscribirTopicoDashboard(): void {
    if (!this.stompClient || !this.stompClient.connected) return;
    this.canalDashboardSuscripcion?.unsubscribe();
    this.canalDashboardSuscripcion = this.stompClient.subscribe('/topic/admin/dashboard', (message: IMessage) => {
      try {
        const raw = JSON.parse(message.body) as OccupancyEvent & {
          colaActualizada?: { totalEnCola?: number; ninosActivos?: number };
        };
        const ninosActivos =
          typeof raw.ninosActivos === 'number'
            ? raw.ninosActivos
            : (raw.colaActualizada?.ninosActivos ?? raw.colaActualizada?.totalEnCola ?? 0);
        this.occupancySubject.next({
          atraccionId: raw.atraccionId,
          ninosActivos,
          operarioNombre: raw.operarioNombre,
          capacidadMaxima: raw.capacidadMaxima
        });
      } catch {
        // Ignorar payload malformado
      }
    });
  }

  private suscribirTopico(): void {
    if (!this.stompClient || !this.stompClient.connected || !this.atraccionIdActiva) return;

    this.canalSuscripcion?.unsubscribe();
    const topico = `/topic/atraccion/${this.atraccionIdActiva}`;

    this.canalSuscripcion = this.stompClient.subscribe(topico, (message: IMessage) => {
      try {
        const parsed = JSON.parse(message.body) as MensajeEstacionWs;
        const ts = parsed.serverTimestamp ?? parsed.timestamp;
        if (ts !== undefined && ts !== null) {
          this.sincronizarRelojServidor(ts);
        }
        this.ultimoMensajeRecibido.set(parsed);
        this.mensajesSubject.next(parsed);
      } catch {
        // Ignorar error de parseo JSON
      }
    });
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
    const win = this.document?.defaultView;
    if (!win || this.listenersIniciados) return;
    win.addEventListener('online', this.handleOnline);
    win.addEventListener('offline', this.handleOffline);
    this.listenersIniciados = true;
  }

  private removerListenersConectividad(): void {
    const win = this.document?.defaultView;
    if (!win || !this.listenersIniciados) return;
    win.removeEventListener('online', this.handleOnline);
    win.removeEventListener('offline', this.handleOffline);
    this.listenersIniciados = false;
  }

  private isWindowAvailable(): boolean {
    return typeof window !== 'undefined' && !!this.document?.defaultView;
  }
}