import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OperarioSeleccionComponent } from './seleccion.component';
import { AuthService } from '../../../../core/services/auth.service';
import { OperacionService } from '../../../../core/services/operacion.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { OfflineQueueService } from '../../../../core/services/offline-queue.service';
import { SoundNotificationService } from '../../../../core/services/sound-notification.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { EstacionTrabajo } from '../../../../core/models/operador.model';
import { By } from '@angular/platform-browser';

describe('OperarioSeleccionComponent (Módulo 4 Integration)', () => {
  let component: OperarioSeleccionComponent;
  let fixture: ComponentFixture<OperarioSeleccionComponent>;

  let authServiceSpy: {
    currentUser: ReturnType<typeof signal>;
    currentUserName: ReturnType<typeof signal>;
    currentUserInitials: ReturnType<typeof signal>;
    logout: ReturnType<typeof vi.fn>;
  };

  let operacionServiceSpy: {
    estacionActiva: ReturnType<typeof signal<EstacionTrabajo | null>>;
    estacionesDisponibles: ReturnType<typeof signal<EstacionTrabajo[]>>;
    ocupacionActual: ReturnType<typeof signal<number>>;
    capacidadMaxima: ReturnType<typeof signal<number>>;
    nivelSaturacionAforo: ReturnType<typeof signal<'BAJO' | 'MEDIO' | 'LLENO'>>;
    paradaEmergenciaActiva: ReturnType<typeof signal<boolean>>;
    escanerDesbloqueado: ReturnType<typeof signal<boolean>>;
    aforoCompleto: ReturnType<typeof signal<boolean>>;
    modalAforoCompletoAbierto: ReturnType<typeof signal<boolean>>;
    resultadoValidacionActual: ReturnType<typeof signal<any>>;
    colaActiva: ReturnType<typeof signal<any[]>>;
    colaOrdenadaPorUrgencia: ReturnType<typeof signal<any[]>>;
    consultarEstacionAsignada: ReturnType<typeof vi.fn>;
    confirmarEstacionTrabajo: ReturnType<typeof vi.fn>;
    desvincularEstacionActiva: ReturnType<typeof vi.fn>;
    validarTicketQr: ReturnType<typeof vi.fn>;
    cerrarResultadoValidacion: ReturnType<typeof vi.fn>;
    cerrarModalAforoCompleto: ReturnType<typeof vi.fn>;
    autorizarIngresoForzadoSupervisor: ReturnType<typeof vi.fn>;
    reanudarParadaEmergencia: ReturnType<typeof vi.fn>;
    pausaGeneral: ReturnType<typeof vi.fn>;
  };

  let wsServiceSpy: {
    estadoConexion: ReturnType<typeof signal<'CONECTADO' | 'RECONECTANDO' | 'SIN_CONEXION'>>;
    obtenerTiempoServidorActual: ReturnType<typeof vi.fn>;
    serverTimeOffsetMs: ReturnType<typeof signal<number>>;
  };

  let offlineQueueSpy: {
    totalPendientes: ReturnType<typeof signal<number>>;
  };

  let soundServiceSpy: {
    reproducirBeepEscaneo: ReturnType<typeof vi.fn>;
    reproducirAlarmaTiempoAgotado: ReturnType<typeof vi.fn>;
    silenciarAlarma: ReturnType<typeof vi.fn>;
    silenciarTodasLasAlarmas: ReturnType<typeof vi.fn>;
    vibrarPreExpiracion: ReturnType<typeof vi.fn>;
  };

  const mockEstacion: EstacionTrabajo = {
    idAsignacion: 1,
    atraccionId: 10,
    atraccionNombre: 'Laberinto Mágico',
    tipoAtraccion: 'TEMPORIZADA',
    capacidadMaxima: 12,
    ocupacionActual: 0,
    duracionMinutosBase: 15,
    operarioId: 1,
    operarioNombre: 'Operario Principal',
    confirmada: true,
    estadoEnlace: 'CONECTADO'
  };

  beforeEach(async () => {
    authServiceSpy = {
      currentUser: signal({ correo: 'operario@tdn.com.co', rol: 'OPERARIO' as const }),
      currentUserName: signal('Operario Principal'),
      currentUserInitials: signal('OP'),
      logout: vi.fn()
    };

    operacionServiceSpy = {
      estacionActiva: signal<EstacionTrabajo | null>(mockEstacion),
      estacionesDisponibles: signal<EstacionTrabajo[]>([mockEstacion]),
      ocupacionActual: signal(0),
      capacidadMaxima: signal(12),
      nivelSaturacionAforo: signal('BAJO'),
      paradaEmergenciaActiva: signal(false),
      escanerDesbloqueado: signal(true),
      aforoCompleto: signal(false),
      modalAforoCompletoAbierto: signal(false),
      resultadoValidacionActual: signal(null),
      colaActiva: signal([]),
      colaOrdenadaPorUrgencia: signal([]),
      consultarEstacionAsignada: vi.fn().mockReturnValue(of([mockEstacion])),
      confirmarEstacionTrabajo: vi.fn(),
      desvincularEstacionActiva: vi.fn().mockReturnValue(of(true)),
      validarTicketQr: vi.fn().mockReturnValue(of({ aprobado: true })),
      cerrarResultadoValidacion: vi.fn(),
      cerrarModalAforoCompleto: vi.fn(),
      autorizarIngresoForzadoSupervisor: vi.fn(),
      reanudarParadaEmergencia: vi.fn(),
      pausaGeneral: vi.fn()
    };

    wsServiceSpy = {
      estadoConexion: signal('CONECTADO'),
      obtenerTiempoServidorActual: vi.fn().mockReturnValue(Date.now()),
      serverTimeOffsetMs: signal(0)
    };

    offlineQueueSpy = {
      totalPendientes: signal(0)
    };

    soundServiceSpy = {
      reproducirBeepEscaneo: vi.fn(),
      reproducirAlarmaTiempoAgotado: vi.fn(),
      silenciarAlarma: vi.fn(),
      silenciarTodasLasAlarmas: vi.fn(),
      vibrarPreExpiracion: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [OperarioSeleccionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: OperacionService, useValue: operacionServiceSpy },
        { provide: WebSocketService, useValue: wsServiceSpy },
        { provide: OfflineQueueService, useValue: offlineQueueSpy },
        { provide: SoundNotificationService, useValue: soundServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OperarioSeleccionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render operator info in footer', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Operario Principal');
    expect(compiled.textContent).toContain('OP');
    expect(compiled.textContent).toContain('Operario');
  });

  it('should render offline banner when disconnected (HU-35.04)', () => {
    wsServiceSpy.estadoConexion.set('RECONECTANDO');
    offlineQueueSpy.totalPendientes.set(3);
    fixture.detectChanges();

    const banner = fixture.debugElement.query(By.css('[data-testid="banner-modo-offline"]'));
    expect(banner).toBeTruthy();
    expect(banner.nativeElement.textContent).toContain('Modo sin conexión');
    expect(banner.nativeElement.textContent).toContain('3 pendiente(s)');
  });

  it('should render emergency stop banner when emergency is active (HU-29.08)', () => {
    operacionServiceSpy.paradaEmergenciaActiva.set(true);
    fixture.detectChanges();

    const alerta = fixture.debugElement.query(By.css('[data-testid="alerta-parada-emergencia"]'));
    expect(alerta).toBeTruthy();
    expect(alerta.nativeElement.textContent).toContain('Parada de Emergencia Activa');
  });

  it('should call logout on button click', () => {
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });
});
