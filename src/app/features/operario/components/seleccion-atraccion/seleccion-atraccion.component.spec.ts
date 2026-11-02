import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeleccionAtraccionComponent } from './seleccion-atraccion.component';
import { OperacionService } from '../../../../core/services/operacion.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { EstacionTrabajo } from '../../../../core/models/operador.model';
import { By } from '@angular/platform-browser';

describe('SeleccionAtraccionComponent (HU-24.07, HU-24.08, HU-34.04)', () => {
  let component: SeleccionAtraccionComponent;
  let fixture: ComponentFixture<SeleccionAtraccionComponent>;

  let operacionServiceSpy: {
    estacionActiva: ReturnType<typeof signal<EstacionTrabajo | null>>;
    estacionesDisponibles: ReturnType<typeof signal<EstacionTrabajo[]>>;
    ocupacionActual: ReturnType<typeof signal<number>>;
    capacidadMaxima: ReturnType<typeof signal<number>>;
    nivelSaturacionAforo: ReturnType<typeof signal<'BAJO' | 'MEDIO' | 'LLENO'>>;
    paradaEmergenciaActiva: ReturnType<typeof signal<boolean>>;
    confirmarEstacionTrabajo: ReturnType<typeof vi.fn>;
    desvincularEstacionActiva: ReturnType<typeof vi.fn>;
    paradaEmergencia: ReturnType<typeof vi.fn>;
    reanudarParadaEmergencia: ReturnType<typeof vi.fn>;
  };

  let wsServiceSpy: {
    estadoConexion: ReturnType<typeof signal>;
  };

  const mockEstacion: EstacionTrabajo = {
    idAsignacion: 1,
    atraccionId: 10,
    atraccionNombre: 'Castillo Inflable',
    tipoAtraccion: 'TEMPORIZADA',
    capacidadMaxima: 12,
    ocupacionActual: 4,
    duracionMinutosBase: 15,
    operarioId: 5,
    operarioNombre: 'Carlos Operario',
    confirmada: false,
    estadoEnlace: 'CONECTADO'
  };

  beforeEach(async () => {
    operacionServiceSpy = {
      estacionActiva: signal<EstacionTrabajo | null>(mockEstacion),
      estacionesDisponibles: signal<EstacionTrabajo[]>([mockEstacion]),
      ocupacionActual: signal(4),
      capacidadMaxima: signal(12),
      nivelSaturacionAforo: signal('BAJO'),
      paradaEmergenciaActiva: signal(false),
      confirmarEstacionTrabajo: vi.fn(),
      desvincularEstacionActiva: vi.fn().mockReturnValue(of(true)),
      paradaEmergencia: vi.fn(),
      reanudarParadaEmergencia: vi.fn()
    };

    wsServiceSpy = {
      estadoConexion: signal('CONECTADO')
    };

    await TestBed.configureTestingModule({
      imports: [SeleccionAtraccionComponent],
      providers: [
        { provide: OperacionService, useValue: operacionServiceSpy },
        { provide: WebSocketService, useValue: wsServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SeleccionAtraccionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render fixed header banner (HU-24.08)', () => {
    expect(component).toBeTruthy();
    const banner = fixture.debugElement.query(By.css('[data-testid="banner-cabecera-operario"]'));
    expect(banner).toBeTruthy();
    expect(banner.nativeElement.textContent).toContain('Castillo Inflable');
    expect(banner.nativeElement.textContent).toContain('Carlos Operario');
  });

  it('should render capacity indicator with 4/12 ratio (HU-34.04)', () => {
    const aforoEl = fixture.debugElement.query(By.css('[data-testid="indicador-aforo-header"]'));
    expect(aforoEl).toBeTruthy();
    expect(aforoEl.nativeElement.textContent).toContain('4/12');
  });

  it('should call confirmarEstacionTrabajo when user clicks confirm button (HU-24.07)', () => {
    const confirmBtn = fixture.debugElement.query(By.css('[data-testid="btn-confirmar-estacion"]'));
    expect(confirmBtn).toBeTruthy();

    confirmBtn.nativeElement.click();
    expect(operacionServiceSpy.confirmarEstacionTrabajo).toHaveBeenCalledWith(mockEstacion);
  });

  it('should call desvincularEstacionActiva when clicking unbind button', () => {
    const unbindBtn = fixture.debugElement.query(By.css('[data-testid="btn-desvincular-estacion"]'));
    expect(unbindBtn).toBeTruthy();

    unbindBtn.nativeElement.click();
    expect(operacionServiceSpy.desvincularEstacionActiva).toHaveBeenCalled();
  });
});
