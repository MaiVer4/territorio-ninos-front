import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { ResetPasswordComponent, strictPasswordValidator } from './reset-password.component';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FormControl } from '@angular/forms';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let authServiceSpy: { resetPassword: ReturnType<typeof vi.fn> };
  let notificationSpy: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authServiceSpy = { resetPassword: vi.fn() };
    notificationSpy = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ token: 'test-token-123' })
          }
        },
        { provide: Router, useValue: { navigate: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create and capture token from queryParams', () => {
    expect(component).toBeTruthy();
    expect(component.token).toBe('test-token-123');
  });

  describe('strictPasswordValidator', () => {
    it('should fail when password has less than 8 characters', () => {
      const control = new FormControl('Ab1');
      const errors = strictPasswordValidator(control);
      expect(errors?.['minlength']).toBe(true);
    });

    it('should fail when missing uppercase letter', () => {
      const control = new FormControl('password123');
      const errors = strictPasswordValidator(control);
      expect(errors?.['missingUppercase']).toBe(true);
    });

    it('should fail when missing lowercase letter', () => {
      const control = new FormControl('PASSWORD123');
      const errors = strictPasswordValidator(control);
      expect(errors?.['missingLowercase']).toBe(true);
    });

    it('should fail when missing number', () => {
      const control = new FormControl('PasswordSecret');
      const errors = strictPasswordValidator(control);
      expect(errors?.['missingNumber']).toBe(true);
    });

    it('should pass when password fulfills all criteria (HU-02)', () => {
      const control = new FormControl('Password123');
      const errors = strictPasswordValidator(control);
      expect(errors).toBeNull();
    });
  });

  it('should validate password mismatch', () => {
    component.resetForm.patchValue({
      nuevaContrasena: 'Password123',
      confirmarContrasena: 'Different123'
    });
    expect(component.resetForm.hasError('mismatch')).toBe(true);
  });

  it('should submit successfully when form is valid', () => {
    authServiceSpy.resetPassword.mockReturnValue(of({ mensaje: 'Clave cambiada con éxito' }));

    component.resetForm.patchValue({
      nuevaContrasena: 'Password123',
      confirmarContrasena: 'Password123'
    });

    component.onSubmit();

    expect(authServiceSpy.resetPassword).toHaveBeenCalledWith('test-token-123', 'Password123');
    expect(notificationSpy.success).toHaveBeenCalledWith('Clave cambiada con éxito');
    expect(component.isCompleted).toBe(true);
  });
});
