import { TestBed } from '@angular/core/testing';
import { WebSocketService, MensajeEstacionWs } from './websocket.service';
import { NotificationService } from './notification.service';

describe('WebSocketService (HU-27.07, HU-27.09, HU-35.03..05)', () => {
  let service: WebSocketService;
  let notificationServiceSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    });

    service = TestBed.inject(WebSocketService);
    service.setDeshabilitarConexionReal(true);
  });

  afterEach(() => {
    service.desconectar();
  });

  it('should initialize with CONECTADO state and 0 offset', () => {
    expect(service).toBeTruthy();
    expect(service.estadoConexion()).toBe('CONECTADO');
    expect(service.serverTimeOffsetMs()).toBe(0);
  });

  it('should calculate server time offset accurately against serverTimestamp (HU-27.09 / RNF8)', () => {
    const fixedNow = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValue(fixedNow);

    // Server is 350ms ahead
    const serverTime = fixedNow + 350;
    const offset = service.sincronizarRelojServidor(serverTime);

    expect(offset).toBe(350);
    expect(service.serverTimeOffsetMs()).toBe(350);
    expect(service.obtenerTiempoServidorActual()).toBe(fixedNow + 350);

    // Works with ISO string
    const isoString = new Date(fixedNow + 150).toISOString();
    service.sincronizarRelojServidor(isoString);
    expect(service.serverTimeOffsetMs()).toBe(150);
  });

  it('should receive messages through observable when emitted (HU-27.07)', async () => {
    const messages: MensajeEstacionWs[] = [];
    const sub = service.conectarEstacion(1).subscribe(msg => {
      messages.push(msg);
    });

    const testMsg: MensajeEstacionWs = {
      tipo: 'ACTUALIZACION_COLA',
      atraccionId: 1,
      serverTimestamp: Date.now() + 200,
      payload: { activos: 5 }
    };

    service.emitirMensajeLocal(testMsg);

    expect(messages.length).toBe(1);
    expect(messages[0].tipo).toBe('ACTUALIZACION_COLA');
    expect(service.ultimoMensajeRecibido()).toEqual(testMsg);
    expect(service.serverTimeOffsetMs()).toBe(200);

    sub.unsubscribe();
  });

  it('should transition to RECONECTANDO and increment retries on backoff (HU-35.03)', () => {
    vi.useFakeTimers();

    service.iniciarReconexionConBackoff();
    expect(service.estadoConexion()).toBe('RECONECTANDO');
    expect(service.reintentosReconexion()).toBe(1);

    vi.useRealTimers();
  });

  it('should build canonical /ws-operacion/websocket broker URL and emit admin dashboard occupancy events', () => {
    expect(service.construirBrokerUrl()).toContain('/ws-operacion/websocket');

    const events: unknown[] = [];
    const sub = service.conectarDashboardAdmin().subscribe(ev => events.push(ev));
    service.emitOccupancyEvent({ atraccionId: 2, ninosActivos: 12, capacidadMaxima: 20 });

    expect(events.length).toBe(1);
    sub.unsubscribe();
  });
});
