import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AsignacionesComponent } from './asignaciones.component';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { UsuarioService } from '../../../../core/services/usuario.service';
import { AsignacionService } from '../../../../core/services/asignacion.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { of } from 'rxjs';
import { Atraccion } from '../../../../core/models/atraccion.model';
import { Usuario } from '../../../../core/models/usuario.model';
import { AsignacionOperario } from '../../../../core/models/asignacion.model';

describe('AsignacionesComponent', () => {
  let component: AsignacionesComponent;
  let fixture: ComponentFixture<AsignacionesComponent>;

  const mockAtracciones: Atraccion[] = [
    { id: 1, nombre: 'Piscina de Pelotas', tipo: 'TEMPORIZADA', tarifaMinuto: 1000, capacidadMaxima: 15, duracionMinutosBase: 15, estado: 'ACTIVO' },
    { id: 2, nombre: 'Toro Mecánico', tipo: 'EVENTOS_CAIDAS', tarifaMinuto: 10000, capacidadMaxima: 1, duracionMinutosBase: 0, estado: 'ACTIVO' }
  ];

  const mockOperarios: Usuario[] = [
    { id: 10, nombre: 'Carlos Gómez', rol: 'OPERARIO', correo: 'carlos@tdn.com', estado: 'ACTIVO' },
    { id: 11, nombre: 'Ana Martínez', rol: 'OPERARIO', correo: 'ana@tdn.com', estado: 'ACTIVO' }
  ];

  const mockAsignaciones: AsignacionOperario[] = [
    { id: 100, atraccionId: 1, atraccionNombre: 'Piscina de Pelotas', operarioId: 10, operarioNombre: 'Carlos Gómez', activo: true }
  ];

  let atraccionServiceSpy: { getAll: ReturnType<typeof vi.fn> };
  let usuarioServiceSpy: { getAll: ReturnType<typeof vi.fn> };
  let asignacionServiceSpy: {
    getActiveAssignments: ReturnType<typeof vi.fn>;
    assignOperator: ReturnType<typeof vi.fn>;
    releaseAssignment: ReturnType<typeof vi.fn>;
  };
  let notificationSpy: { success: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    atraccionServiceSpy = { getAll: vi.fn().mockReturnValue(of(mockAtracciones)) };
    usuarioServiceSpy = { getAll: vi.fn().mockReturnValue(of(mockOperarios)) };
    asignacionServiceSpy = {
      getActiveAssignments: vi.fn().mockReturnValue(of(mockAsignaciones)),
      assignOperator: vi.fn().mockReturnValue(of({ id: 101, atraccionId: 2, operarioId: 11, activo: true })),
      releaseAssignment: vi.fn().mockReturnValue(of({}))
    };
    notificationSpy = { success: vi.fn(), info: vi.fn() };

    TestBed.configureTestingModule({
      imports: [AsignacionesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AtraccionService, useValue: atraccionServiceSpy },
        { provide: UsuarioService, useValue: usuarioServiceSpy },
        { provide: AsignacionService, useValue: asignacionServiceSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    fixture = TestBed.createComponent(AsignacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created and load initial data', () => {
    expect(component).toBeTruthy();
    expect(component.atracciones().length).toBe(2);
    expect(component.operarios().length).toBe(2);
    expect(component.asignaciones().length).toBe(1);
    expect(component.operariosDisponibles().length).toBe(1);
    expect(component.operariosDisponibles()[0].id).toBe(11); // Ana Martínez está disponible
  });

  it('should assign an available operator', () => {
    const row = component.rows().find(r => r.atraccion.id === 2);
    expect(row).toBeTruthy();
    row!.selectedOperarioId = 11;

    component.asignarOperario(row!);
    expect(asignacionServiceSpy.assignOperator).toHaveBeenCalledWith(2, 11, false);
    expect(notificationSpy.success).toHaveBeenCalledWith('Operario Ana Martínez asignado correctamente.');
  });

  it('should detect conflict when operator is already assigned to another attraction (Escenario 2 HU-10)', () => {
    const row = component.rows().find(r => r.atraccion.id === 2);
    row!.selectedOperarioId = 10; // Carlos Gómez ya está en atracción 1

    component.asignarOperario(row!);
    expect(component.conflicto()).toBeTruthy();
    expect(component.conflicto()?.operarioNombre).toBe('Carlos Gómez');
    expect(asignacionServiceSpy.assignOperator).not.toHaveBeenCalled();
  });

  it('should reassign operator when conflict is confirmed with force flag', () => {
    const row = component.rows().find(r => r.atraccion.id === 2);
    row!.selectedOperarioId = 10;
    component.asignarOperario(row!);

    expect(component.conflicto()).toBeTruthy();
    component.confirmarReasignacion();

    expect(asignacionServiceSpy.assignOperator).toHaveBeenCalledWith(2, 10, true);
    expect(component.conflicto()).toBeNull();
  });

  it('should release an assigned operator station', () => {
    const row = component.rows().find(r => r.atraccion.id === 1);
    expect(row?.asignacion).toBeTruthy();

    component.liberarOperario(row!);
    expect(asignacionServiceSpy.releaseAssignment).toHaveBeenCalledWith(100);
    expect(notificationSpy.info).toHaveBeenCalledWith('Estación liberada.');
  });
});
