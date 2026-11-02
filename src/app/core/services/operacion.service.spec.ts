import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OperacionService } from './operacion.service';
import { AuthService } from './auth.service';
import { AsignacionService } from './asignacion.service';
import { NotificationService } from './notification.service';
import { SoundNotificationService } from './sound-notification.service';
import { WebSocketService } from './websocket.service';
import { OfflineQueueService } from './offline-queue.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { EstacionTrabajo, ResultadoValidacionQr } from '../models/operador.model';

describe('OperacionService (HU-24, HU-26, HU-28, HU-29, HU-32, HU-34)', () => {
  let service: OperacionService;
  let httpMock: HttpTestingController;

  let authServiceSpy: {
    currentUser: ReturnType<typeof signal>;
    currentUserName: ReturnType<typeof signal>;
    getRole: ReturnType<typeof vi.fn>;
  };
  let asignacionServiceSpy: {
    getActiveAssignments: ReturnType<typeof vi.fn>;
  };
  let soundServiceSpy: {
    reproducirBeepEscaneo: ReturnType<typeof vi.fn>;
    reproducirAlarmaTiempoAgotado: ReturnType<typeof vi.fn>;
    silenciarAlarma: ReturnType<typeof vi.fn>;
    silenciarTodasLasAlarmas: ReturnType<typeof vi.fn>;
    vibrarPreExpiracion: ReturnType<typeof vi.fn>;
  };
  let wsServiceSpy: {
    estadoConexion: ReturnType<typeof signal>;
    conectarEstacion: ReturnType<typeof vi.fn>;
    desconectar: ReturnType<typeof vi.fn>;
    obtenerTiempoServidorActual: ReturnType<typeof vi.fn>;
  };
  let notificationServiceSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    sessionStorage.clear();

    authServiceSpy = {
      currentUser: signal({ id: 10, nombre: 'Operador Test', correo: 'op@tdn.com', rol: 'OPERARIO' as const, token: 'mock', tipoToken: 'Bearer' }),
      currentUserName: signal('Operador Test'),
      getRole: vi.fn().mockReturnValue('OPERARIO')
    };

    asignacionServiceSpy = {
      getActiveAssignments: vi.fn().mockReturnValue(of([
        {
          id: 1,
          atraccionId: 1,
          atraccionNombre: 'Laberinto Mágico',
          operarioId: 10,
          operarioNombre: 'Operador Test',
          activo: true
        }
      ]))
    };

    soundServiceSpy = {
      reproducirBeepEscaneo: vi.fn().mockReturnValue(true),
      reproducirAlarmaTiempoAgotado: vi.fn().mockReturnValue(true),
      silenciarAlarma: vi.fn().mockReturnValue(true),
      silenciarTodasLasAlarmas: vi.fn(),
      vibrarPreExpiracion: vi.fn().mockReturnValue(true)
    };

    wsServiceSpy = {
      estadoConexion: signal('CONECTADO'),
      conectarEstacion: vi.fn(),
      desconectar: vi.fn(),
      obtenerTiempoServidorActual: vi.fn().mockReturnValue(1700000000000)
    };

    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        OperacionService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AsignacionService, useValue: asignacionServiceSpy },
        { provide: SoundNotificationService, useValue: soundServiceSpy },
        { provide: WebSocketService, useValue: wsServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        OfflineQueueService
      ]
    });

    service = TestBed.inject(OperacionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should initialize and fetch active station on demand (HU-24.06)', async () => {
    const estaciones = await new Promise<EstacionTrabajo[]>(resolve => {
      service.consultarEstacionAsignada().subscribe(res => resolve(res));
    });

    expect(estaciones.length).toBeGreaterThan(0);
    expect(service.estacionActiva()).toBeTruthy();
    expect(service.estacionActiva()?.atraccionNombre).toBe('Laberinto Mágico');
  });

  it('should confirm station and enable scanner flag (HU-24.06, HU-24.07, HU-34.06)', () => {
    const estacion: EstacionTrabajo = {
      idAsignacion: 1,
      atraccionId: 1,
      atraccionNombre: 'Laberinto Mágico',
      tipoAtraccion: 'TEMPORIZADA',
      capacidadMaxima: 10,
      ocupacionActual: 0,
      duracionMinutosBase: 15,
      operarioId: 10,
      operarioNombre: 'Operador Test',
      confirmada: false,
      estadoEnlace: 'CONECTADO'
    };

    service.confirmarEstacionTrabajo(estacion);

    expect(service.estacionActiva()?.confirmada).toBe(true);
    expect(service.escanerDesbloqueado()).toBe(true);
    expect(wsServiceSpy.conectarEstacion).toHaveBeenCalledWith(1);
    expect(notificationServiceSpy.success).toHaveBeenCalled();
  });

  it('should validate QR and allow entrance of child (HU-25, HU-26.07..09)', () => {
    service.confirmarEstacionTrabajo({
      idAsignacion: 1,
      atraccionId: 1,
      atraccionNombre: 'Laberinto',
      tipoAtraccion: 'TEMPORIZADA',
      capacidadMaxima: 5,
      ocupacionActual: 0,
      duracionMinutosBase: 15,
      operarioId: 10,
      operarioNombre: 'Op',
      confirmada: true,
      estadoEnlace: 'CONECTADO'
    });

    let resultado: ResultadoValidacionQr | undefined;
    service.validarTicketQr('BOL-VALIDO-123').subscribe(val => {
      resultado = val;
    });

    const req = httpMock.expectOne('/territorioninos/api/operacion/validar-qr');
    expect(req.request.method).toBe('POST');
    req.flush({
      aprobado: true,
      uuid: 'BOL-VALIDO-123',
      codigoBoleta: 'BOL-VALIDO-123',
      mensajeExplicativo: 'Boleto verificado',
      menorNombre: 'Santiago',
      menorEdad: 7,
      duracionMinutos: 15
    });

    expect(resultado).toBeDefined();
    expect(resultado!.aprobado).toBe(true);
    expect(soundServiceSpy.reproducirBeepEscaneo).toHaveBeenCalled();

    const sesion = service.permitirIngresoMenor(resultado!);
    expect(sesion).toBeTruthy();
    expect(service.ocupacionActual()).toBe(1);
    expect(service.colaActiva().length).toBe(1);
  });

  it('should reject ticket if already in use in attraction (HU-26.08)', () => {
    const resAprobado: ResultadoValidacionQr = {
      aprobado: true,
      uuid: 'UUID-DUPLICADO',
      codigoBoleta: 'BOL-DUP',
      mensajeExplicativo: 'Ok',
      menorNombre: 'Niño 1',
      duracionMinutos: 15
    };

    service.permitirIngresoMenor(resAprobado);

    let reintento: ResultadoValidacionQr | undefined;
    service.validarTicketQr('UUID-DUPLICADO').subscribe(val => {
      reintento = val;
    });

    expect(reintento).toBeDefined();
    expect(reintento!.aprobado).toBe(false);
    expect(reintento!.causaRechazo).toBe('BOLETO_YA_CONSUMIDO');
  });

  it('should manage pause, emergency stop and resume (HU-29.07..09)', () => {
    const sesion = service.permitirIngresoMenor({
      aprobado: true,
      uuid: 'U1',
      codigoBoleta: 'B1',
      mensajeExplicativo: 'Ok',
      menorNombre: 'Niño Pausa',
      duracionMinutos: 15
    })!;

    expect(service.colaActiva()[0].enPausa).toBe(false);

    // Pause individual
    service.pausarSesion(sesion.idSesion, 'BANO_MENOR');
    expect(service.colaActiva()[0].enPausa).toBe(true);
    expect(service.colaActiva()[0].estadoSemaforo).toBe('PAUSADO');

    // Resume individual
    service.reanudarSesion(sesion.idSesion);
    expect(service.colaActiva()[0].enPausa).toBe(false);

    // Emergency stop
    service.paradaEmergencia('Revisión técnica urgente');
    expect(service.paradaEmergenciaActiva()).toBe(true);
    expect(service.escanerDesbloqueado()).toBe(false);
    expect(service.colaActiva()[0].enPausa).toBe(true);

    // Resume emergency stop
    service.reanudarParadaEmergencia();
    expect(service.paradaEmergenciaActiva()).toBe(false);
    expect(service.colaActiva()[0].enPausa).toBe(false);
  });

  it('should handle capacity limits, block scanner and permit supervisor override (HU-34.04..06)', () => {
    service.confirmarEstacionTrabajo({
      idAsignacion: 1,
      atraccionId: 1,
      atraccionNombre: 'Inflable',
      tipoAtraccion: 'TEMPORIZADA',
      capacidadMaxima: 2,
      ocupacionActual: 0,
      duracionMinutosBase: 15,
      operarioId: 10,
      operarioNombre: 'Op',
      confirmada: true,
      estadoEnlace: 'CONECTADO'
    });

    service.permitirIngresoMenor({ aprobado: true, uuid: '1', mensajeExplicativo: 'ok', duracionMinutos: 15 });
    service.permitirIngresoMenor({ aprobado: true, uuid: '2', mensajeExplicativo: 'ok', duracionMinutos: 15 });

    expect(service.ocupacionActual()).toBe(2);
    expect(service.aforoCompleto()).toBe(true);
    expect(service.nivelSaturacionAforo()).toBe('LLENO');
    expect(service.escanerDesbloqueado()).toBe(false);

    // Supervisor override
    expect(service.autorizarIngresoForzadoSupervisor('')).toBe(false);
    expect(service.autorizarIngresoForzadoSupervisor('wrong-pin')).toBe(false);
    const autorizado = service.autorizarIngresoForzadoSupervisor('1234');
    expect(autorizado).toBe(true);
    expect(service.escanerDesbloqueado()).toBe(true);
  });

  it('should confirm child exit with animation flag and free capacity (HU-32.06..08)', async () => {
    vi.useFakeTimers();

    const sesion = service.permitirIngresoMenor({
      aprobado: true,
      uuid: 'U-SALIDA',
      mensajeExplicativo: 'ok',
      menorNombre: 'Niño Saliente',
      duracionMinutos: 15
    })!;

    expect(service.ocupacionActual()).toBe(1);

    service.confirmarSalidaMenor(sesion.idSesion);
    // Initially marked as saliendo
    expect(service.colaActiva()[0].saliendo).toBe(true);
    expect(service.ocupacionActual()).toBe(0);

    // Fast-forward animation timeout (300ms)
    vi.advanceTimersByTime(350);

    expect(service.colaActiva().length).toBe(0);
    expect(soundServiceSpy.silenciarAlarma).toHaveBeenCalledWith(sesion.idSesion);

    vi.useRealTimers();
  });
});
