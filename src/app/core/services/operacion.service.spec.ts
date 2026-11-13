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
    TestBed.resetTestingModule();
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

    const req = httpMock.expectOne(r => r.url.includes('/operacion/escanear'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.uuid).toBe('BOL-VALIDO-123');
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
    const reqSesion = httpMock.expectOne(r => r.url.includes('/operacion/iniciar-sesion'));
    expect(reqSesion.request.method).toBe('POST');
    reqSesion.flush({ status: 'OK' });

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
    const reqSesion = httpMock.expectOne(r => r.url.includes('/operacion/iniciar-sesion'));
    reqSesion.flush({ status: 'OK' });

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
    const reqIniciar = httpMock.expectOne(r => r.url.includes('/operacion/iniciar-sesion'));
    reqIniciar.flush({ status: 'OK' });

    expect(service.colaActiva()[0].enPausa).toBe(false);

    // Pause individual
    service.pausarSesion(sesion.idSesion, 'BANO_MENOR');
    const reqPausa = httpMock.expectOne(r => r.url.includes(`/operacion/sesiones/${sesion.idSesion}/pausar`));
    reqPausa.flush({ status: 'OK' });
    expect(service.colaActiva()[0].enPausa).toBe(true);
    expect(service.colaActiva()[0].estadoSemaforo).toBe('PAUSADO');

    // Resume individual
    service.reanudarSesion(sesion.idSesion);
    const reqReanudar = httpMock.expectOne(r => r.url.includes(`/operacion/sesiones/${sesion.idSesion}/reanudar`));
    reqReanudar.flush({ status: 'OK' });
    expect(service.colaActiva()[0].enPausa).toBe(false);

    // Emergency stop
    service.paradaEmergencia('Revisión técnica urgente');
    const reqEmergencia = httpMock.expectOne(r => r.url.includes('/operacion/atraccion/1/pausa-general'));
    reqEmergencia.flush({ status: 'OK' });
    expect(service.paradaEmergenciaActiva()).toBe(true);
    expect(service.escanerDesbloqueado()).toBe(false);
    expect(service.colaActiva()[0].enPausa).toBe(true);

    // Resume emergency stop
    service.reanudarParadaEmergencia();
    const reqReanudarGen = httpMock.expectOne(r => r.url.includes(`/operacion/sesiones/${sesion.idSesion}/reanudar`));
    reqReanudarGen.flush({ status: 'OK' });
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
    const reqSesion1 = httpMock.expectOne(r => r.url.includes('/operacion/iniciar-sesion'));
    reqSesion1.flush({ status: 'OK' });

    service.permitirIngresoMenor({ aprobado: true, uuid: '2', mensajeExplicativo: 'ok', duracionMinutos: 15 });
    const reqSesion2 = httpMock.expectOne(r => r.url.includes('/operacion/iniciar-sesion'));
    reqSesion2.flush({ status: 'OK' });

    expect(service.ocupacionActual()).toBe(2);
    expect(service.aforoCompleto()).toBe(true);
    expect(service.nivelSaturacionAforo()).toBe('LLENO');
    expect(service.escanerDesbloqueado()).toBe(false);

    // Supervisor override
    expect(service.autorizarIngresoForzadoSupervisor('')).toBe(false);
    expect(service.autorizarIngresoForzadoSupervisor('wrong-pin')).toBe(false);
    const autorizado = service.autorizarIngresoForzadoSupervisor('1234');
    const reqOverride = httpMock.expectOne(r => r.url.includes('/operacion/autorizar-sobreaforo'));
    expect(reqOverride.request.method).toBe('POST');
    reqOverride.flush(null);

    expect(autorizado).toBe(true);
    expect(service.escanerDesbloqueado()).toBe(true);
  });

  it('should reject QR ticket when backend responds with 404/422 instead of approving locally (Fail-Closed)', () => {
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
    service.validarTicketQr('BOL-INEXISTENTE-999').subscribe(val => {
      resultado = val;
    });

    const req = httpMock.expectOne(r => r.url.includes('/operacion/escanear'));
    req.flush(
      { causaRechazo: 'BOLETO_NO_ENCONTRADO', mensajeExplicativo: 'El boleto no existe en la base de datos.' },
      { status: 404, statusText: 'Not Found' }
    );

    expect(resultado).toBeDefined();
    expect(resultado!.aprobado).toBe(false);
    expect(resultado!.causaRechazo).toBe('BOLETO_NO_ENCONTRADO');
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
    const reqIniciar = httpMock.expectOne(r => r.url.includes('/operacion/iniciar-sesion'));
    reqIniciar.flush({ status: 'OK' });

    expect(service.ocupacionActual()).toBe(1);

    service.confirmarSalidaMenor(sesion.idSesion);
    const reqFinalizar = httpMock.expectOne(r => r.url.includes(`/operacion/sesiones/${sesion.idSesion}/salida`));
    reqFinalizar.flush({ status: 'OK' });

    // Initially marked as saliendo
    expect(service.colaActiva()[0].saliendo).toBe(true);
    expect(service.ocupacionActual()).toBe(0);

    // Fast-forward animation timeout (300ms)
    vi.advanceTimersByTime(350);

    expect(service.colaActiva().length).toBe(0);
    expect(soundServiceSpy.silenciarAlarma).toHaveBeenCalledWith(sesion.idSesion);

    vi.useRealTimers();
  });

  it('should enqueue action in offlineQueue when WS is disconnected (HU-35.06)', () => {
    wsServiceSpy.estadoConexion.set('SIN_CONEXION');
    const queue = TestBed.inject(OfflineQueueService);
    queue.limpiarCola();

    service.paradaEmergencia('Parada por corte de luz');
    expect(queue.hayAccionesPendientes()).toBe(true);
    expect(queue.totalPendientes()).toBe(1);
    expect(queue.accionesPendientes()[0].tipo).toBe('PARADA_EMERGENCIA');
  });

  it('should synchronize offline queue when sincronizarColaOffline is executed', () => {
    const queue = TestBed.inject(OfflineQueueService);
    queue.limpiarCola();
    queue.encolarAccion('PAUSAR_SESION', 1, { idSesion: 'ses-1', motivo: 'BANO_MENOR' });
    expect(queue.totalPendientes()).toBe(1);

    service.sincronizarColaOffline().subscribe(res => {
      expect(res.procesadas).toBe(1);
      expect(queue.totalPendientes()).toBe(0);
    });

    const reqSync = httpMock.expectOne(r => r.url.includes('/operacion/sincronizar-evento'));
    expect(reqSync.request.method).toBe('POST');
    reqSync.flush({ status: 'OK' });
  });
});
