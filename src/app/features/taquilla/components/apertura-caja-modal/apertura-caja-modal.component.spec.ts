import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AperturaCajaModalComponent } from './apertura-caja-modal.component';
import { CajaService } from '../../../../core/services/caja.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { TurnoResponseDTO } from '../../../../core/models/caja.model';

describe('AperturaCajaModalComponent', () => {
  let component: AperturaCajaModalComponent;
  let fixture: ComponentFixture<AperturaCajaModalComponent>;
  let cajaServiceSpy: { abrirTurno: ReturnType<typeof vi.fn> };
  let authServiceSpy: { currentUser: any; currentUserName?: any; currentUserInitials?: any; logout: ReturnType<typeof vi.fn> };
  let notificationServiceSpy: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };

  const mockTurno: TurnoResponseDTO = {
    idTurno: 77,
    usuarioId: 10,
    montoInicial: 100000,
    fechaApertura: '2026-10-20T10:00:00Z',
    estado: 'ABIERTO'
  };

  beforeEach(async () => {
    cajaServiceSpy = {
      abrirTurno: vi.fn()
    };
    authServiceSpy = {
      currentUser: signal({ correo: 'cajero@tdn.com.co', nombre: 'Cajero Principal', rol: 'TAQUILLERO' }),
      currentUserName: signal('Cajero Principal'),
      currentUserInitials: signal('CP'),
      logout: vi.fn()
    };
    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [AperturaCajaModalComponent],
      providers: [
        { provide: CajaService, useValue: cajaServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AperturaCajaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the modal with default values ($50.000)', () => {
    expect(component).toBeTruthy();
    expect(component.montoNumerico()).toBe(50000);
    expect(component.montoFormateado()).toContain('50.000');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Apertura de Caja');
    expect(compiled.textContent).toContain('Cajero Principal');
  });

  it('should render shortcut buttons for $50.000, $100.000, and $200.000', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button[type="button"]');
    const shortcutTexts = Array.from(buttons).map(b => (b as HTMLButtonElement).textContent?.trim());

    expect(shortcutTexts.some(t => t?.includes('50.000'))).toBe(true);
    expect(shortcutTexts.some(t => t?.includes('100.000'))).toBe(true);
    expect(shortcutTexts.some(t => t?.includes('200.000'))).toBe(true);
  });

  it('should update amount when selecting a shortcut', () => {
    component.seleccionarAtajo(100000);
    expect(component.montoNumerico()).toBe(100000);
    expect(component.montoFormateado()).toContain('100.000');

    component.seleccionarAtajo(200000);
    expect(component.montoNumerico()).toBe(200000);
    expect(component.montoFormateado()).toContain('200.000');
  });

  it('should format input with COP currency mask on manual typing', () => {
    const mockEvent = {
      target: { value: '150000abc' }
    } as unknown as Event;

    component.onInputMonto(mockEvent);

    expect(component.montoNumerico()).toBe(150000);
    expect(component.montoFormateado()).toContain('150.000');
  });

  it('should handle empty input gracefully', () => {
    const mockEvent = {
      target: { value: '' }
    } as unknown as Event;

    component.onInputMonto(mockEvent);

    expect(component.montoNumerico()).toBe(0);
    expect(component.montoFormateado()).toBe('$ 0');
  });

  it('should open caja and emit turnoIniciado on valid submission', () => {
    cajaServiceSpy.abrirTurno.mockReturnValue(of(mockTurno));

    let emittedTurno: TurnoResponseDTO | undefined;
    component.turnoIniciado.subscribe(turno => {
      emittedTurno = turno;
    });

    component.seleccionarAtajo(100000);
    component.observaciones.set('Base entregada por tesorería');

    component.confirmarApertura();

    expect(cajaServiceSpy.abrirTurno).toHaveBeenCalledWith({
      montoInicial: 100000,
      observaciones: 'Base entregada por tesorería'
    });
    expect(notificationServiceSpy.success).toHaveBeenCalled();
    expect(emittedTurno).toEqual(mockTurno);
  });

  it('should handle backend errors during caja opening', () => {
    cajaServiceSpy.abrirTurno.mockReturnValue(throwError(() => ({
      error: { mensaje: 'El cajero ya tiene un turno abierto' }
    })));

    let emitted = false;
    component.turnoIniciado.subscribe(() => {
      emitted = true;
    });

    component.confirmarApertura();

    expect(notificationServiceSpy.error).toHaveBeenCalledWith('El cajero ya tiene un turno abierto');
    expect(emitted).toBe(false);
    expect(component.cargando()).toBe(false);
  });

  it('should trigger logout when clicking Cerrar sesión', () => {
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });
});
