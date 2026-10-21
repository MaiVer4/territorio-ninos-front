import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaquillaPosComponent } from './pos.component';
import { AuthService } from '../../../../core/services/auth.service';
import { CajaService } from '../../../../core/services/caja.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ResultadoArqueoDTO, TurnoResponseDTO } from '../../../../core/models/caja.model';
import { By } from '@angular/platform-browser';

describe('TaquillaPosComponent', () => {
  let component: TaquillaPosComponent;
  let fixture: ComponentFixture<TaquillaPosComponent>;
  let authServiceSpy: { currentUser: any; logout: ReturnType<typeof vi.fn> };
  let cajaServiceSpy: {
    obtenerTurnoActivo: ReturnType<typeof vi.fn>;
    abrirTurno: ReturnType<typeof vi.fn>;
    cerrarTurno: ReturnType<typeof vi.fn>;
  };
  let notificationServiceSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  };

  const mockTurno: TurnoResponseDTO = {
    idTurno: 42,
    usuarioId: 7,
    montoInicial: 80000,
    totalRecaudado: 120000,
    fechaApertura: '2026-10-20T08:30:00Z',
    estado: 'ABIERTO'
  };

  beforeEach(async () => {
    authServiceSpy = {
      currentUser: signal({ correo: 'taquillero@tdn.com.co', rol: 'TAQUILLERO' }),
      logout: vi.fn()
    };
    cajaServiceSpy = {
      obtenerTurnoActivo: vi.fn().mockReturnValue(of(null)),
      abrirTurno: vi.fn(),
      cerrarTurno: vi.fn()
    };
    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [TaquillaPosComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CajaService, useValue: cajaServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();
  });

  const setupComponent = async (turnoResult: TurnoResponseDTO | null = null, shouldError = false) => {
    if (shouldError) {
      cajaServiceSpy.obtenerTurnoActivo.mockReturnValue(throwError(() => new Error('Error')));
    } else {
      cajaServiceSpy.obtenerTurnoActivo.mockReturnValue(of(turnoResult));
    }

    fixture = TestBed.createComponent(TaquillaPosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('should automatically display AperturaCajaModalComponent when active turno is null', async () => {
    await setupComponent(null);

    expect(component).toBeTruthy();
    expect(component.mostrarModalApertura()).toBe(true);

    const modal = fixture.debugElement.query(By.css('app-apertura-caja-modal'));
    expect(modal).toBeTruthy();
  });

  it('should automatically display AperturaCajaModalComponent when API call fails', async () => {
    await setupComponent(null, true);

    expect(component.mostrarModalApertura()).toBe(true);
    const modal = fixture.debugElement.query(By.css('app-apertura-caja-modal'));
    expect(modal).toBeTruthy();
  });

  it('should not display modal if active shift is ABIERTO and compute expected cash', async () => {
    await setupComponent(mockTurno);

    expect(component.mostrarModalApertura()).toBe(false);
    expect(component.turnoActual()).toEqual(mockTurno);
    expect(component.montoEsperadoArqueo()).toBe(200000); // 80000 + 120000

    const modal = fixture.debugElement.query(By.css('app-apertura-caja-modal'));
    expect(modal).toBeFalsy();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Turno #42');
  });

  it('should hide modal and update turnoActual when onTurnoIniciado is called', async () => {
    await setupComponent(null);
    expect(component.mostrarModalApertura()).toBe(true);

    component.onTurnoIniciado(mockTurno);
    fixture.detectChanges();

    expect(component.mostrarModalApertura()).toBe(false);
    expect(component.turnoActual()).toEqual(mockTurno);

    const modal = fixture.debugElement.query(By.css('app-apertura-caja-modal'));
    expect(modal).toBeFalsy();
  });

  it('should display arqueo modal when clicking "Arqueo / Cerrar Caja"', async () => {
    await setupComponent(mockTurno);

    expect(component.mostrarModalArqueo()).toBe(false);
    component.iniciarArqueo();
    fixture.detectChanges();

    expect(component.mostrarModalArqueo()).toBe(true);
    const arqueoModal = fixture.debugElement.query(By.css('app-arqueo-caja-modal'));
    expect(arqueoModal).toBeTruthy();
  });

  it('should close arqueo modal when cancel is triggered', async () => {
    await setupComponent(mockTurno);
    component.iniciarArqueo();
    fixture.detectChanges();

    expect(component.mostrarModalArqueo()).toBe(true);

    const arqueoModal = fixture.debugElement.query(By.css('app-arqueo-caja-modal'));
    arqueoModal.triggerEventHandler('cancelar', null);
    fixture.detectChanges();

    expect(component.mostrarModalArqueo()).toBe(false);
  });

  it('should process arqueo confirmation, close shift, and show apertura modal', async () => {
    await setupComponent(mockTurno);
    cajaServiceSpy.cerrarTurno.mockReturnValue(of({ ...mockTurno, estado: 'CERRADO' }));

    component.iniciarArqueo();
    fixture.detectChanges();

    const mockResultadoArqueo: ResultadoArqueoDTO = {
      idTurno: 42,
      montoEsperado: 200000,
      totalFisico: 200000,
      diferencia: 0,
      estadoBalance: 'CUADRADO',
      desglose: []
    };

    component.onArqueoConfirmado(mockResultadoArqueo);

    expect(cajaServiceSpy.cerrarTurno).toHaveBeenCalledWith({
      idTurno: 42,
      montoFinal: 200000,
      totalEfectivoReal: 200000,
      observaciones: undefined,
      diferencia: 0,
      justificacion: undefined
    });
    expect(component.mostrarModalArqueo()).toBe(false);
    expect(component.turnoActual()).toBeNull();
    expect(component.mostrarModalApertura()).toBe(true);
    expect(notificationServiceSpy.success).toHaveBeenCalled();
  });

  it('should handle error when closing shift with arqueo', async () => {
    await setupComponent(mockTurno);
    cajaServiceSpy.cerrarTurno.mockReturnValue(throwError(() => ({
      error: { mensaje: 'Error de prueba al cerrar caja' }
    })));

    const mockResultadoArqueo: ResultadoArqueoDTO = {
      idTurno: 42,
      montoEsperado: 200000,
      totalFisico: 180000,
      diferencia: -20000,
      estadoBalance: 'FALTANTE',
      justificacion: 'Faltante justificado de 20k',
      desglose: []
    };

    component.onArqueoConfirmado(mockResultadoArqueo);

    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Error de prueba al cerrar caja');
    expect(component.turnoActual()).not.toBeNull();
  });

  it('should call logout on button click', async () => {
    await setupComponent(mockTurno);
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });
});
