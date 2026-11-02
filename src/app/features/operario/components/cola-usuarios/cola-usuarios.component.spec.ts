import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColaUsuariosComponent } from './cola-usuarios.component';
import { OperacionService } from '../../../../core/services/operacion.service';
import { SoundNotificationService } from '../../../../core/services/sound-notification.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { signal } from '@angular/core';
import { SesionJuegoMenor } from '../../../../core/models/operador.model';
import { By } from '@angular/platform-browser';

describe('ColaUsuariosComponent (HU-28, HU-29, HU-30, HU-31, HU-32)', () => {
  let component: ColaUsuariosComponent;
  let fixture: ComponentFixture<ColaUsuariosComponent>;

  let operacionServiceSpy: {
    colaActiva: ReturnType<typeof signal<SesionJuegoMenor[]>>;
    colaOrdenadaPorUrgencia: ReturnType<typeof signal<SesionJuegoMenor[]>>;
    ocupacionActual: ReturnType<typeof signal<number>>;
    pausarSesion: ReturnType<typeof vi.fn>;
    reanudarSesion: ReturnType<typeof vi.fn>;
    confirmarSalidaMenor: ReturnType<typeof vi.fn>;
  };

  let soundServiceSpy: {
    vibrarPreExpiracion: ReturnType<typeof vi.fn>;
    reproducirAlarmaTiempoAgotado: ReturnType<typeof vi.fn>;
    silenciarAlarma: ReturnType<typeof vi.fn>;
  };

  let wsServiceSpy: {
    obtenerTiempoServidorActual: ReturnType<typeof vi.fn>;
    serverTimeOffsetMs: ReturnType<typeof signal<number>>;
  };

  const mockSesion: SesionJuegoMenor = {
    idSesion: 'ses-1',
    ticketUuid: 'UUID-1',
    codigoBoleta: 'BOL-001',
    atraccionId: 1,
    tipoAtraccion: 'TEMPORIZADA',
    menorNombre: 'Lucía Gómez',
    menorEdad: 5,
    acudienteNombre: 'Ana Gómez',
    horaInicio: new Date().toISOString(),
    horaFin: new Date(Date.now() + 600 * 1000).toISOString(),
    duracionTotalSegundos: 600,
    segundosRestantes: 600,
    segundosExcedidos: 0,
    estadoSemaforo: 'VERDE',
    enPausa: false
  };

  beforeEach(async () => {
    operacionServiceSpy = {
      colaActiva: signal([mockSesion]),
      colaOrdenadaPorUrgencia: signal([mockSesion]),
      ocupacionActual: signal(1),
      pausarSesion: vi.fn(),
      reanudarSesion: vi.fn(),
      confirmarSalidaMenor: vi.fn()
    };

    soundServiceSpy = {
      vibrarPreExpiracion: vi.fn(),
      reproducirAlarmaTiempoAgotado: vi.fn(),
      silenciarAlarma: vi.fn()
    };

    wsServiceSpy = {
      obtenerTiempoServidorActual: vi.fn().mockReturnValue(Date.now()),
      serverTimeOffsetMs: signal(0)
    };

    await TestBed.configureTestingModule({
      imports: [ColaUsuariosComponent],
      providers: [
        { provide: OperacionService, useValue: operacionServiceSpy },
        { provide: SoundNotificationService, useValue: soundServiceSpy },
        { provide: WebSocketService, useValue: wsServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ColaUsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render active child card with names and green badge (HU-28.04, HU-28.05, HU-28.07)', () => {
    const tarjeta = fixture.debugElement.query(By.css('[data-testid="tarjeta-menor-ses-1"]'));
    expect(tarjeta).toBeTruthy();
    expect(tarjeta.nativeElement.textContent).toContain('Lucía Gómez');
    expect(tarjeta.nativeElement.textContent).toContain('Ana Gómez');
    expect(tarjeta.nativeElement.textContent).toContain('EN JUEGO');
  });

  it('should open pause modal and trigger pausarSesion (HU-29.07)', () => {
    const btnPausa = fixture.debugElement.query(By.css('[data-testid="btn-pausa-menor-ses-1"]'));
    expect(btnPausa).toBeTruthy();

    btnPausa.nativeElement.click();
    fixture.detectChanges();

    expect(component.sesionParaPausar()).toEqual(mockSesion);

    component.confirmarPausa();
    expect(operacionServiceSpy.pausarSesion).toHaveBeenCalledWith('ses-1', component.opcionesPausa[0].etiqueta);
  });

  it('should call confirmarSalidaMenor when exit button is clicked (HU-32.06)', () => {
    const btnSalida = fixture.debugElement.query(By.css('[data-testid="btn-confirmar-salida-ses-1"]'));
    expect(btnSalida).toBeTruthy();

    btnSalida.nativeElement.click();
    expect(operacionServiceSpy.confirmarSalidaMenor).toHaveBeenCalledWith('ses-1');
  });

  it('should show silence button when time is expired and call soundService.silenciarAlarma (HU-31.06)', () => {
    const sesionExpirada: SesionJuegoMenor = {
      ...mockSesion,
      idSesion: 'ses-exp',
      segundosRestantes: 0,
      estadoSemaforo: 'ROJO',
      alarmaSilenciada: false
    };

    operacionServiceSpy.colaOrdenadaPorUrgencia.set([sesionExpirada]);
    fixture.detectChanges();

    const btnSilenciar = fixture.debugElement.query(By.css('[data-testid="btn-silenciar-alarma-ses-exp"]'));
    expect(btnSilenciar).toBeTruthy();

    btnSilenciar.nativeElement.click();
    expect(soundServiceSpy.silenciarAlarma).toHaveBeenCalledWith('ses-exp');
  });
});
