import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ColaboradorFormComponent, strictPasswordValidator } from './colaborador-form.component';
import { UsuarioService } from '../../../../core/services/usuario.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Usuario } from '../../../../core/models/usuario.model';
import { FormControl } from '@angular/forms';

describe('ColaboradorFormComponent', () => {
  let component: ColaboradorFormComponent;
  let fixture: ComponentFixture<ColaboradorFormComponent>;
  let usuarioServiceSpy: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let notificationSpy: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };

  const setupComponent = async (data: Usuario | null = null) => {
    usuarioServiceSpy = {
      create: vi.fn(),
      update: vi.fn()
    };
    notificationSpy = {
      success: vi.fn(),
      error: vi.fn()
    };
    dialogRefSpy = {
      close: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ColaboradorFormComponent],
      providers: [
        { provide: UsuarioService, useValue: usuarioServiceSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ColaboradorFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('strictPasswordValidator', () => {
    it('should validate requirements properly', () => {
      expect(strictPasswordValidator(new FormControl(''))).toBeNull();
      expect(strictPasswordValidator(new FormControl('abc'))).toHaveProperty('minlength');
      expect(strictPasswordValidator(new FormControl('abcdefgh'))).toHaveProperty('missingUppercase');
      expect(strictPasswordValidator(new FormControl('ABCDEFGH'))).toHaveProperty('missingLowercase');
      expect(strictPasswordValidator(new FormControl('Abcdefgh'))).toHaveProperty('missingNumber');
      expect(strictPasswordValidator(new FormControl('Password123'))).toBeNull();
    });
  });

  describe('Component Behavior', () => {
    it('should initialize in create mode with default TAQUILLERO role and password required', async () => {
      await setupComponent(null);
      expect(component.isEdit()).toBe(false);
      expect(component.form.get('rol')?.value).toBe('TAQUILLERO');
      expect(component.form.valid).toBe(false);
    });

    it('should initialize in edit mode with user data and password not required', async () => {
      const mockUser: Usuario = {
        id: 10,
        nombre: 'Carlos Gómez',
        correo: 'carlos@tdn.com.co',
        rol: 'OPERARIO',
        estado: 'ACTIVO'
      };
      await setupComponent(mockUser);

      expect(component.isEdit()).toBe(true);
      expect(component.form.get('nombre')?.value).toBe('Carlos Gómez');
      expect(component.form.get('rol')?.value).toBe('OPERARIO');
      expect(component.form.valid).toBe(true);
    });

    it('should toggle estado between ACTIVO and INACTIVO', async () => {
      await setupComponent(null);
      expect(component.form.get('estado')?.value).toBe('ACTIVO');
      component.toggleEstado();
      expect(component.form.get('estado')?.value).toBe('INACTIVO');
      component.toggleEstado();
      expect(component.form.get('estado')?.value).toBe('ACTIVO');
    });

    it('should change role when setRol is called', async () => {
      await setupComponent(null);
      component.setRol('ADMINISTRADOR');
      expect(component.form.get('rol')?.value).toBe('ADMINISTRADOR');
    });

    it('should submit successfully in create mode and close dialog', async () => {
      await setupComponent(null);
      const createdUser: Usuario = { id: 101, nombre: 'Ana Gómez', correo: 'ana@tdn.com.co', rol: 'TAQUILLERO' };
      usuarioServiceSpy.create.mockReturnValue(of(createdUser));

      component.form.setValue({
        nombre: 'Ana Gómez',
        correo: 'ana@tdn.com.co',
        rol: 'TAQUILLERO',
        estado: 'ACTIVO',
        password: 'Password123'
      });

      component.onSubmit();

      expect(usuarioServiceSpy.create).toHaveBeenCalled();
      expect(notificationSpy.success).toHaveBeenCalledWith('Usuario Ana Gómez creado exitosamente.');
      expect(dialogRefSpy.close).toHaveBeenCalledWith(createdUser);
    });

    it('should submit successfully in edit mode and close dialog', async () => {
      const existingUser: Usuario = { id: 2, nombre: 'Ana Gómez', correo: 'ana@tdn.com.co', rol: 'TAQUILLERO' };
      await setupComponent(existingUser);
      usuarioServiceSpy.update.mockReturnValue(of({ ...existingUser, nombre: 'Ana María Gómez' }));

      component.form.patchValue({ nombre: 'Ana María Gómez' });
      component.onSubmit();

      expect(usuarioServiceSpy.update).toHaveBeenCalledWith(2, expect.objectContaining({
        nombre: 'Ana María Gómez'
      }));
      expect(notificationSpy.success).toHaveBeenCalled();
      expect(dialogRefSpy.close).toHaveBeenCalled();
    });

    it('should display error toast and keep dialog open when backend creation fails', async () => {
      await setupComponent(null);
      usuarioServiceSpy.create.mockReturnValue(throwError(() => ({
        error: { mensaje: 'El correo electrónico ya se encuentra registrado.' }
      })));

      component.form.setValue({
        nombre: 'Duplicado',
        correo: 'duplicado@tdn.com.co',
        rol: 'OPERARIO',
        estado: 'ACTIVO',
        password: 'Password123'
      });

      component.onSubmit();

      expect(usuarioServiceSpy.create).toHaveBeenCalled();
      expect(notificationSpy.error).toHaveBeenCalledWith('El correo electrónico ya se encuentra registrado.');
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
      expect(component.loading()).toBe(false);
    });
  });
});
