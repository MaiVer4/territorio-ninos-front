import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultadoValidacionComponent } from './resultado-validacion.component';
import { OperacionService } from '../../../../core/services/operacion.service';
import { signal } from '@angular/core';
import { ResultadoValidacionQr, SesionJuegoMenor } from '../../../../core/models/operador.model';
import { By } from '@angular/platform-browser';

describe('ResultadoValidacionComponent (HU-26.07..09 / RNF3)', () => {
  let component: ResultadoValidacionComponent;
  let fixture: ComponentFixture<ResultadoValidacionComponent>;

  let operacionServiceSpy: {
    resultadoValidacionActual: ReturnType<typeof signal<ResultadoValidacionQr | null>>;
    estacionActiva: ReturnType<typeof signal<any>>;
    permitirIngresoMenor: ReturnType<typeof vi.fn>;
    cerrarResultadoValidacion: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    operacionServiceSpy = {
      resultadoValidacionActual: signal<ResultadoValidacionQr | null>(null),
      estacionActiva: signal({ atraccionNombre: 'Laberinto Mágico' }),
      permitirIngresoMenor: vi.fn(),
      cerrarResultadoValidacion: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ResultadoValidacionComponent],
      providers: [
        { provide: OperacionService, useValue: operacionServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultadoValidacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render nothing when no result is present', () => {
    const modal = fixture.debugElement.query(By.css('[data-testid="modal-resultado-validacion"]'));
    expect(modal).toBeNull();
  });

  it('should render high-contrast green banner and Permitir Ingreso button when approved (HU-26.07, HU-26.09)', () => {
    const mockAprobado: ResultadoValidacionQr = {
      aprobado: true,
      uuid: 'UUID-OK-123',
      codigoBoleta: 'BOL-998877',
      mensajeExplicativo: 'Boleto válido',
      menorNombre: 'Mateo',
      menorEdad: 6,
      duracionMinutos: 15
    };

    operacionServiceSpy.resultadoValidacionActual.set(mockAprobado);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('[data-testid="badge-estado-validacion"]'));
    expect(badge).toBeTruthy();
    expect(badge.nativeElement.textContent).toContain('BOLETO APROBADO');

    const btnPermitir = fixture.debugElement.query(By.css('[data-testid="btn-permitir-ingreso"]'));
    expect(btnPermitir).toBeTruthy();

    const mockSesion: SesionJuegoMenor = {
      idSesion: 'ses-1',
      ticketUuid: 'UUID-OK-123',
      codigoBoleta: 'BOL-998877',
      atraccionId: 1,
      tipoAtraccion: 'TEMPORIZADA',
      menorNombre: 'Mateo',
      acudienteNombre: 'Papa',
      horaInicio: '',
      horaFin: '',
      duracionTotalSegundos: 900,
      segundosRestantes: 900,
      segundosExcedidos: 0,
      estadoSemaforo: 'VERDE',
      enPausa: false
    };
    operacionServiceSpy.permitirIngresoMenor.mockReturnValue(mockSesion);

    btnPermitir.nativeElement.click();
    expect(operacionServiceSpy.permitirIngresoMenor).toHaveBeenCalledWith(mockAprobado);
  });

  it('should render high-contrast red banner and exact rejection cause when rejected (HU-26.07, HU-26.08)', () => {
    const mockRechazado: ResultadoValidacionQr = {
      aprobado: false,
      uuid: 'UUID-FAIL-456',
      causaRechazo: 'BOLETO_YA_CONSUMIDO',
      mensajeExplicativo: 'Boleto ya consumido o menor actualmente dentro de la atracción.'
    };

    operacionServiceSpy.resultadoValidacionActual.set(mockRechazado);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('[data-testid="badge-estado-validacion"]'));
    expect(badge).toBeTruthy();
    expect(badge.nativeElement.textContent).toContain('ACCESO RECHAZADO');

    const causaMsg = fixture.debugElement.query(By.css('[data-testid="causa-rechazo-mensaje"]'));
    expect(causaMsg).toBeTruthy();
    expect(causaMsg.nativeElement.textContent).toContain('Boleto ya consumido');

    // Should NOT have "Permitir Ingreso" button
    const btnPermitir = fixture.debugElement.query(By.css('[data-testid="btn-permitir-ingreso"]'));
    expect(btnPermitir).toBeNull();
  });
});
