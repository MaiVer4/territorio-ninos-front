import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: { login: ReturnType<typeof vi.fn> };
  let notificationSpy: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = { login: vi.fn() };
    notificationSpy = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be invalid when fields are empty', () => {
    expect(component.loginForm.valid).toBe(false);
  });

  it('should submit successfully and route ADMINISTRADOR to admin dashboard', () => {
    authServiceSpy.login.mockReturnValue(of({
      token: 'valid-jwt',
      tipoToken: 'Bearer',
      correo: 'admin@tdn.com.co',
      rol: 'ADMINISTRADOR'
    }));

    component.loginForm.setValue({
      correo: 'admin@tdn.com.co',
      contrasena: 'Admin1234'
    });

    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalledWith({
      correo: 'admin@tdn.com.co',
      password: 'Admin1234'
    });
    expect(notificationSpy.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('should display toast error on 401 invalid credentials', () => {
    authServiceSpy.login.mockReturnValue(throwError(() => ({ status: 401 })));

    component.loginForm.setValue({
      correo: 'admin@tdn.com.co',
      contrasena: 'WrongPassword'
    });

    component.onSubmit();

    expect(notificationSpy.error).toHaveBeenCalledWith('Credenciales inválidas. Por favor, verifica tu correo y contraseña.');
  });

  it('should display specific backend message on 403 or 423 errors', () => {
    authServiceSpy.login.mockReturnValue(throwError(() => ({
      status: 423,
      error: { mensaje: 'Cuenta bloqueada temporalmente por 15 minutos.' }
    })));

    component.loginForm.setValue({
      correo: 'admin@tdn.com.co',
      contrasena: 'WrongPassword'
    });

    component.onSubmit();

    expect(notificationSpy.error).toHaveBeenCalledWith('Cuenta bloqueada temporalmente por 15 minutos.');
  });

  it('should not submit if already loading', () => {
    component.isLoading = true;
    component.loginForm.setValue({
      correo: 'admin@tdn.com.co',
      contrasena: 'Admin1234'
    });

    component.onSubmit();

    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('should navigate to returnUrl if present in queryParams upon login', () => {
    const route = TestBed.inject(ActivatedRoute);
    (route.snapshot as any).queryParams = { returnUrl: '/admin/configuracion' };

    authServiceSpy.login.mockReturnValue(of({
      token: 'valid-jwt',
      tipoToken: 'Bearer',
      correo: 'admin@tdn.com.co',
      rol: 'ADMINISTRADOR'
    }));

    component.loginForm.setValue({
      correo: 'admin@tdn.com.co',
      contrasena: 'Admin1234'
    });

    component.onSubmit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/configuracion');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
