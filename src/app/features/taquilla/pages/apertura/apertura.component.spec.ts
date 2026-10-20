import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AperturaComponent } from './apertura.component';
import { CajaService } from '../../../../core/services/caja.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

describe('AperturaComponent', () => {
  let component: AperturaComponent;
  let fixture: ComponentFixture<AperturaComponent>;
  let cajaServiceSpy: { abrirTurno: ReturnType<typeof vi.fn> };
  let authServiceSpy: { currentUser: any; logout: ReturnType<typeof vi.fn> };
  let notificationServiceSpy: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    cajaServiceSpy = {
      abrirTurno: vi.fn()
    };
    authServiceSpy = {
      currentUser: signal({ correo: 'cajero@tdn.com.co', nombre: 'Cajero Demo', rol: 'TAQUILLERO' }),
      logout: vi.fn()
    };
    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };
    routerSpy = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [AperturaComponent],
      providers: [
        { provide: CajaService, useValue: cajaServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AperturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and display user info', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cajero Demo');
  });

  it('should open caja and navigate to /taquilla/pos on valid input', () => {
    component.montoInicial = 60000;
    component.observaciones = 'Base con billetes de 10k y 20k';
    cajaServiceSpy.abrirTurno.mockReturnValue(of({ idTurno: 1, estado: 'ABIERTO' }));

    component.abrirCaja();

    expect(cajaServiceSpy.abrirTurno).toHaveBeenCalledWith({
      montoInicial: 60000,
      observaciones: 'Base con billetes de 10k y 20k'
    });
    expect(notificationServiceSpy.success).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/taquilla/pos']);
  });

  it('should prevent opening caja if montoInicial is negative', () => {
    component.montoInicial = -100;
    component.abrirCaja();

    expect(cajaServiceSpy.abrirTurno).not.toHaveBeenCalled();
    expect(notificationServiceSpy.warn).toHaveBeenCalledWith('El monto inicial no puede ser negativo.');
  });

  it('should handle error when abrirTurno fails', () => {
    component.montoInicial = 50000;
    cajaServiceSpy.abrirTurno.mockReturnValue(throwError(() => ({
      error: { mensaje: 'Ya existe un turno abierto para este cajero' }
    })));

    component.abrirCaja();

    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Ya existe un turno abierto para este cajero');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should call authService.logout on logout()', () => {
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });
});
