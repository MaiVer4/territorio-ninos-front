import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let authServiceSpy: { forgotPassword: ReturnType<typeof vi.fn> };
  let notificationSpy: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authServiceSpy = { forgotPassword: vi.fn() };
    notificationSpy = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate email field', () => {
    const emailControl = component.forgotForm.get('email');
    emailControl?.setValue('');
    expect(emailControl?.hasError('required')).toBe(true);

    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBe(true);

    emailControl?.setValue('valid@tdn.com.co');
    expect(emailControl?.valid).toBe(true);
  });

  it('should submit successfully and display success notification', () => {
    authServiceSpy.forgotPassword.mockReturnValue(of({ mensaje: 'Correo enviado con éxito' }));

    component.forgotForm.setValue({ email: 'test@tdn.com.co' });
    component.onSubmit();

    expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith('test@tdn.com.co');
    expect(notificationSpy.success).toHaveBeenCalledWith('Correo enviado con éxito');
    expect(component.emailSent).toBe(true);
  });

  it('should handle error and display error toast', () => {
    authServiceSpy.forgotPassword.mockReturnValue(throwError(() => ({ error: { mensaje: 'Error al enviar' } })));

    component.forgotForm.setValue({ email: 'test@tdn.com.co' });
    component.onSubmit();

    expect(notificationSpy.error).toHaveBeenCalledWith('Error al enviar');
    expect(component.emailSent).toBe(false);
  });
});
