import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { jwtInterceptor } from './jwt.interceptor';

describe('jwtInterceptor', () => {
  let httpTesting: HttpTestingController;
  let httpClient: HttpClient;
  const TOKEN_KEY = 'tdn_jwt_token';

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('should attach Authorization Bearer header when token is present in localStorage', () => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: 'mock-jwt-token' }));

    httpClient.get('/api/test').subscribe();

    const req = httpTesting.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');
    req.flush({});
  });

  it('should not attach Authorization header when no token is present', () => {
    httpClient.get('/api/test').subscribe();

    const req = httpTesting.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should not attach Authorization header to external third-party URLs even when token exists', () => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: 'mock-jwt-token' }));

    httpClient.get('https://external-api.com/data').subscribe();

    const req = httpTesting.expectOne('https://external-api.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should not attach Authorization header to public auth endpoints even when token exists', () => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: 'mock-jwt-token' }));

    httpClient.post('/api/auth/login', {}).subscribe();
    httpClient.post('/api/auth/forgot-password', {}).subscribe();
    httpClient.post('/api/auth/reset-password', {}).subscribe();

    const reqLogin = httpTesting.expectOne('/api/auth/login');
    const reqForgot = httpTesting.expectOne('/api/auth/forgot-password');
    const reqReset = httpTesting.expectOne('/api/auth/reset-password');

    expect(reqLogin.request.headers.has('Authorization')).toBe(false);
    expect(reqForgot.request.headers.has('Authorization')).toBe(false);
    expect(reqReset.request.headers.has('Authorization')).toBe(false);

    reqLogin.flush({});
    reqForgot.flush({});
    reqReset.flush({});
  });
});
