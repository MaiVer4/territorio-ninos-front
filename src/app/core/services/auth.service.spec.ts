import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { AuthResponse } from '../models/auth.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };
  let notificationSpy: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };

  const TOKEN_KEY = 'tdn_jwt_token';

  beforeEach(() => {
    localStorage.clear();
    routerSpy = { navigate: vi.fn() };
    notificationSpy = { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save token and update currentUser upon successful login', () => {
    const mockResponse: AuthResponse = {
      token: 'jwt-test-token',
      tipoToken: 'Bearer',
      correo: 'admin@tdn.com.co',
      rol: 'ADMINISTRADOR'
    };

    service.login({ correo: 'admin@tdn.com.co', password: 'Password123' }).subscribe(res => {
      expect(res.token).toBe('jwt-test-token');
      expect(service.currentUser()?.correo).toBe('admin@tdn.com.co');
      expect(service.getToken()).toBe('jwt-test-token');
      expect(service.getRole()).toBe('ADMINISTRADOR');
    });

    const req = httpTesting.expectOne(request => request.url.includes('/auth/login'));
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should call backend /logout and clear storage on normal logout', () => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: 'active-token', rol: 'ADMINISTRADOR', correo: 'a@tdn.co' }));

    service.logout();

    const req = httpTesting.expectOne(request => request.url.includes('/auth/logout'));
    expect(req.request.method).toBe('POST');
    req.flush({ mensaje: 'Sesión cerrada con éxito' });

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    expect(notificationSpy.info).toHaveBeenCalledWith('Sesión cerrada con éxito');
  });

  it('should not clear session on 409 conflict during logout (e.g. open cash register)', () => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: 'active-token', rol: 'TAQUILLERO', correo: 't@tdn.co' }));

    service.logout();

    const req = httpTesting.expectOne(request => request.url.includes('/auth/logout'));
    req.flush({ mensaje: 'Caja abierta pendiente de arqueo' }, { status: 409, statusText: 'Conflict' });

    expect(localStorage.getItem(TOKEN_KEY)).not.toBeNull();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(notificationSpy.warn).toHaveBeenCalledWith('Caja abierta pendiente de arqueo');
  });

  it('should purge storage immediately when force logout is called', () => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: 'active-token' }));

    service.logout(true);

    httpTesting.expectNone(request => request.url.includes('/auth/logout'));
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
