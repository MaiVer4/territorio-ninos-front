import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaquillaPosComponent } from './pos.component';
import { AuthService } from '../../../../core/services/auth.service';
import { CajaService } from '../../../../core/services/caja.service';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { TurnoResponseDTO } from '../../../../core/models/caja.model';
import { By } from '@angular/platform-browser';

describe('TaquillaPosComponent', () => {
  let component: TaquillaPosComponent;
  let fixture: ComponentFixture<TaquillaPosComponent>;
  let authServiceSpy: { currentUser: any; logout: ReturnType<typeof vi.fn> };
  let cajaServiceSpy: { obtenerTurnoActivo: ReturnType<typeof vi.fn>; abrirTurno: ReturnType<typeof vi.fn> };

  const mockTurno: TurnoResponseDTO = {
    idTurno: 42,
    usuarioId: 7,
    montoInicial: 80000,
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
      abrirTurno: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [TaquillaPosComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CajaService, useValue: cajaServiceSpy }
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

  it('should not display modal if active shift is ABIERTO', async () => {
    await setupComponent(mockTurno);

    expect(component.mostrarModalApertura()).toBe(false);
    expect(component.turnoActual()).toEqual(mockTurno);

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

  it('should call logout on button click', async () => {
    await setupComponent(mockTurno);
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });
});
