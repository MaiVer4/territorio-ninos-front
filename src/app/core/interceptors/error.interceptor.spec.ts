import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';

describe('errorInterceptor', () => {
  let httpTesting: HttpTestingController;
  let httpClient: HttpClient;
  let authServiceSpy: { logout: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceSpy = { logout: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should call authService.logout(true) when regular API returns 401', () => {
    httpClient.get('/api/protected-resource').subscribe({
      error: () => {}
    });

    const req = httpTesting.expectOne('/api/protected-resource');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.logout).toHaveBeenCalledWith(true);
  });

  it('should NOT call authService.logout when /auth/login returns 401', () => {
    httpClient.post('/api/auth/login', {}).subscribe({
      error: () => {}
    });

    const req = httpTesting.expectOne('/api/auth/login');
    req.flush('Invalid credentials', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });

  it('should NOT call authService.logout when /auth/logout returns 401 to avoid infinite loop', () => {
    httpClient.post('/api/auth/logout', {}).subscribe({
      error: () => {}
    });

    const req = httpTesting.expectOne('/api/auth/logout');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });
});
