import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { cajaAbiertaGuard } from './caja-abierta.guard';
import { CajaService } from '../services/caja.service';
import { NotificationService } from '../services/notification.service';
import { of, throwError, Observable, firstValueFrom } from 'rxjs';

describe('cajaAbiertaGuard', () => {
  let cajaServiceSpy: { verificarCajaAbierta: ReturnType<typeof vi.fn> };
  let notificationServiceSpy: { warn: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    cajaServiceSpy = {
      verificarCajaAbierta: vi.fn()
    };
    notificationServiceSpy = {
      warn: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: CajaService, useValue: cajaServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    });

    router = TestBed.inject(Router);
  });

  const runGuard = async () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/taquilla/pos' } as RouterStateSnapshot;
    const result$ = TestBed.runInInjectionContext(() => cajaAbiertaGuard(route, state)) as Observable<boolean | UrlTree>;
    return firstValueFrom(result$);
  };

  it('should allow access to /taquilla/pos when caja is open', async () => {
    cajaServiceSpy.verificarCajaAbierta.mockReturnValue(of(true));

    const result = await runGuard();
    expect(result).toBe(true);
    expect(notificationServiceSpy.warn).not.toHaveBeenCalled();
  });

  it('should block access and redirect to /taquilla/apertura with warning when caja is not open', async () => {
    cajaServiceSpy.verificarCajaAbierta.mockReturnValue(of(false));

    const result = await runGuard();
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/taquilla/apertura');
    expect(notificationServiceSpy.warn).toHaveBeenCalledWith(
      'Debes realizar la apertura de caja antes de ingresar al punto de venta.'
    );
  });

  it('should block access and redirect to /taquilla/apertura when verification throws an error', async () => {
    cajaServiceSpy.verificarCajaAbierta.mockReturnValue(throwError(() => new Error('Network error')));

    const result = await runGuard();
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/taquilla/apertura');
    expect(notificationServiceSpy.warn).toHaveBeenCalledWith(
      'No se pudo verificar el estado de la caja. Por favor verifica tu turno.'
    );
  });
});
