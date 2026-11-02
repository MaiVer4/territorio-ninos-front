import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModoEventoComponent } from './modo-evento.component';
import { OperacionService } from '../../../../core/services/operacion.service';
import { signal } from '@angular/core';
import { SesionJuegoMenor } from '../../../../core/models/operador.model';
import { By } from '@angular/platform-browser';

describe('ModoEventoComponent (HU-33.05..08, Toro Mecánico)', () => {
  let component: ModoEventoComponent;
  let fixture: ComponentFixture<ModoEventoComponent>;

  let operacionServiceSpy: {
    colaActiva: ReturnType<typeof signal<SesionJuegoMenor[]>>;
    ocupacionActual: ReturnType<typeof signal<number>>;
    paradaEmergenciaActiva: ReturnType<typeof signal<boolean>>;
    registrarCaidaModoEvento: ReturnType<typeof vi.fn>;
    confirmarSalidaMenor: ReturnType<typeof vi.fn>;
  };

  const mockSesionToro: SesionJuegoMenor = {
    idSesion: 'ses-toro-1',
    ticketUuid: 'UUID-TORO-1',
    codigoBoleta: 'BOL-TORO-1',
    atraccionId: 2,
    tipoAtraccion: 'EVENTOS_CAIDAS',
    menorNombre: 'Martín Jinete',
    acudienteNombre: 'Pedro Jinete',
    horaInicio: new Date().toISOString(),
    horaFin: new Date(Date.now() + 600 * 1000).toISOString(),
    duracionTotalSegundos: 600,
    segundosRestantes: 600,
    segundosExcedidos: 0,
    estadoSemaforo: 'VERDE',
    enPausa: false,
    intentosRealizados: 1,
    intentosMaximos: 3,
    recordSegundosRonda: 45
  };

  beforeEach(async () => {
    operacionServiceSpy = {
      colaActiva: signal([mockSesionToro]),
      ocupacionActual: signal(1),
      paradaEmergenciaActiva: signal(false),
      registrarCaidaModoEvento: vi.fn(),
      confirmarSalidaMenor: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ModoEventoComponent],
      providers: [
        { provide: OperacionService, useValue: operacionServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ModoEventoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should render participant card with badges and record time (HU-33.05, HU-33.06, HU-33.08)', () => {
    const tarjeta = fixture.debugElement.query(By.css('[data-testid="tarjeta-toro-ses-toro-1"]'));
    expect(tarjeta).toBeTruthy();
    expect(tarjeta.nativeElement.textContent).toContain('Martín Jinete');

    // Badge Intento 1 completed
    const badge1 = fixture.debugElement.query(By.css('[data-testid="badge-intento-ses-toro-1-1"]'));
    expect(badge1).toBeTruthy();
    expect(badge1.nativeElement.textContent).toContain('1 de 3');

    // Record time 45 seconds formatted as 00:45
    expect(tarjeta.nativeElement.textContent).toContain('00:45');
  });

  it('should call registrarCaidaModoEvento when button is clicked (HU-33.07)', () => {
    const btnCaida = fixture.debugElement.query(By.css('[data-testid="btn-registrar-caida-ses-toro-1"]'));
    expect(btnCaida).toBeTruthy();

    btnCaida.nativeElement.click();
    expect(operacionServiceSpy.registrarCaidaModoEvento).toHaveBeenCalledWith('ses-toro-1', expect.any(Number));
  });

  it('should call confirmarSalidaMenor on exit click', () => {
    const btnSalida = fixture.debugElement.query(By.css('[data-testid="btn-salida-toro-ses-toro-1"]'));
    expect(btnSalida).toBeTruthy();

    btnSalida.nativeElement.click();
    expect(operacionServiceSpy.confirmarSalidaMenor).toHaveBeenCalledWith('ses-toro-1');
  });
});
