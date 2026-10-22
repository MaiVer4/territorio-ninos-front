import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ColaboradoresComponent, UserRow } from './colaboradores.component';
import { UsuarioService } from '../../../../core/services/usuario.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Usuario } from '../../../../core/models/usuario.model';

describe('ColaboradoresComponent', () => {
  let component: ColaboradoresComponent;
  let fixture: ComponentFixture<ColaboradoresComponent>;
  let usuarioServiceSpy: {
    getAll: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let notificationServiceSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  const mockUsuarios: Usuario[] = [
    {
      id: 1,
      nombre: 'Carlos Gómez',
      correo: 'carlos@tdn.com',
      rol: 'OPERARIO',
      estado: 'ACTIVO'
    },
    {
      id: 2,
      nombre: 'Ana María Martínez',
      correo: 'ana@tdn.com',
      rol: 'TAQUILLERO',
      estado: 'ACTIVO'
    },
    {
      id: 3,
      nombre: 'David Morales',
      correo: 'david@tdn.com',
      rol: 'ADMINISTRADOR',
      estado: 'INACTIVO'
    }
  ];

  beforeEach(async () => {
    usuarioServiceSpy = {
      getAll: vi.fn().mockReturnValue(of(mockUsuarios)),
      update: vi.fn().mockReturnValue(of(mockUsuarios[0])),
      delete: vi.fn().mockReturnValue(of({ mensaje: 'Eliminado' })),
      create: vi.fn().mockReturnValue(of(mockUsuarios[0]))
    };

    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ColaboradoresComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: UsuarioService, useValue: usuarioServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ColaboradoresComponent);
    component = fixture.componentInstance;
  });

  it('should create the component and load users on init', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(usuarioServiceSpy.getAll).toHaveBeenCalled();
    expect(component.usuarios().length).toBe(3);
    expect(component.filteredUsuarios().length).toBe(3);
  });

  describe('Búsqueda y filtrado de usuarios', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return all users when search query is empty or only whitespace', () => {
      component.searchQuery.set('');
      expect(component.filteredUsuarios().length).toBe(3);

      component.searchQuery.set('   ');
      expect(component.filteredUsuarios().length).toBe(3);
    });

    it('should filter users by name (case-insensitive)', () => {
      component.searchQuery.set('carlos');
      expect(component.filteredUsuarios().length).toBe(1);
      expect(component.filteredUsuarios()[0].nombre).toBe('Carlos Gómez');

      component.searchQuery.set('MARTÍNEZ');
      expect(component.filteredUsuarios().length).toBe(1);
      expect(component.filteredUsuarios()[0].nombre).toBe('Ana María Martínez');
    });

    it('should filter users by email', () => {
      component.searchQuery.set('ana@tdn.com');
      expect(component.filteredUsuarios().length).toBe(1);
      expect(component.filteredUsuarios()[0].correo).toBe('ana@tdn.com');

      component.searchQuery.set('@tdn.com');
      expect(component.filteredUsuarios().length).toBe(3);
    });

    it('should filter users by role', () => {
      component.searchQuery.set('ADMINISTRADOR');
      expect(component.filteredUsuarios().length).toBe(1);
      expect(component.filteredUsuarios()[0].rol).toBe('ADMINISTRADOR');

      component.searchQuery.set('taquillero');
      expect(component.filteredUsuarios().length).toBe(1);
      expect(component.filteredUsuarios()[0].rol).toBe('TAQUILLERO');
    });

    it('should return empty list when no user matches the search query', () => {
      component.searchQuery.set('nonexistent user');
      expect(component.filteredUsuarios().length).toBe(0);
    });
  });

  describe('Toggle de estado del usuario', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should change status from ACTIVO to INACTIVO optimistically and call update service', () => {
      const userToToggle: UserRow = component.usuarios()[0];
      const updatedUser = { ...userToToggle, estado: 'INACTIVO' as const };
      usuarioServiceSpy.update.mockReturnValue(of(updatedUser));

      component.toggleEstado(userToToggle);

      const updatedInList = component.usuarios().find(u => u.id === 1);
      expect(updatedInList?.estado).toBe('INACTIVO');

      expect(usuarioServiceSpy.update).toHaveBeenCalledWith(1, expect.objectContaining({
        id: 1,
        estado: 'INACTIVO'
      }));

      expect(notificationServiceSpy.success).toHaveBeenCalledWith(
        expect.stringContaining('Inactivo')
      );
    });

    it('should change status from INACTIVO to ACTIVO optimistically and call update service', () => {
      const userToToggle: UserRow = component.usuarios()[2];
      const updatedUser = { ...userToToggle, estado: 'ACTIVO' as const };
      usuarioServiceSpy.update.mockReturnValue(of(updatedUser));

      component.toggleEstado(userToToggle);

      const updatedInList = component.usuarios().find(u => u.id === 3);
      expect(updatedInList?.estado).toBe('ACTIVO');

      expect(usuarioServiceSpy.update).toHaveBeenCalledWith(3, expect.objectContaining({
        id: 3,
        estado: 'ACTIVO'
      }));

      expect(notificationServiceSpy.success).toHaveBeenCalledWith(
        expect.stringContaining('Activo')
      );
    });

    it('should revert optimistic status update and notify error when service fails', () => {
      const userToToggle: UserRow = component.usuarios()[0];
      usuarioServiceSpy.update.mockReturnValue(
        throwError(() => ({ error: { mensaje: 'Error al cambiar estado' } }))
      );

      component.toggleEstado(userToToggle);

      const inList = component.usuarios().find(u => u.id === 1);
      expect(inList?.estado).toBe('ACTIVO');

      expect(notificationServiceSpy.error).toHaveBeenCalledWith('Error al cambiar estado');
    });

    it('should revert with default error message when error object has no mensaje property', () => {
      const userToToggle: UserRow = component.usuarios()[0];
      usuarioServiceSpy.update.mockReturnValue(throwError(() => new Error('Server error')));

      component.toggleEstado(userToToggle);

      const inList = component.usuarios().find(u => u.id === 1);
      expect(inList?.estado).toBe('ACTIVO');

      expect(notificationServiceSpy.error).toHaveBeenCalledWith('No se pudo actualizar el estado del usuario en el servidor.');
    });
  });

  describe('Formateo y badges de rol', () => {
    it('should format roles correctly', () => {
      expect(component.formatRol('ADMINISTRADOR')).toBe('Administrador');
      expect(component.formatRol('TAQUILLERO')).toBe('Taquillero');
      expect(component.formatRol('OPERARIO')).toBe('Operario');
      expect(component.formatRol(undefined)).toBe('Sin rol');
    });

    it('should return correct initials', () => {
      expect(component.getInitials('Carlos Gómez')).toBe('CG');
      expect(component.getInitials('Ana')).toBe('A');
    });

    it('should return role badge class according to role', () => {
      expect(component.getRoleBadgeClass('ADMINISTRADOR')).toContain('violet');
      expect(component.getRoleBadgeClass('TAQUILLERO')).toContain('blue');
      expect(component.getRoleBadgeClass('OPERARIO')).toContain('emerald');
    });
  });
});
