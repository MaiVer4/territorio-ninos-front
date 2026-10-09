import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authServiceSpy: { isAuthenticated: ReturnType<typeof vi.fn>; getRole: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    authServiceSpy = {
      isAuthenticated: vi.fn(),
      getRole: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    router = TestBed.inject(Router);
  });

  const runGuard = (routeData: Record<string, any> = {}) => {
    const route = { data: routeData } as unknown as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => authGuard(route, state));
  };

  it('should redirect unauthenticated users to /login', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);

    const result = runGuard();
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/login');
  });

  it('should preserve requested URL as returnUrl queryParam when unauthenticated', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);

    const route = { data: {} } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/admin/configuracion' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result instanceof UrlTree).toBe(true);
    const urlTree = result as UrlTree;
    expect(urlTree.queryParams['returnUrl']).toBe('/admin/configuracion');
  });

  it('should allow authenticated users when no roles are specified', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(true);

    const result = runGuard();
    expect(result).toBe(true);
  });

  it('should allow authenticated user having the required role', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(true);
    authServiceSpy.getRole.mockReturnValue('ADMINISTRADOR');

    const result = runGuard({ roles: ['ADMINISTRADOR'] });
    expect(result).toBe(true);
  });

  it('should redirect authenticated user without required role to /unauthorized', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(true);
    authServiceSpy.getRole.mockReturnValue('OPERARIO');

    const result = runGuard({ roles: ['ADMINISTRADOR'] });
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/unauthorized');
  });
});
