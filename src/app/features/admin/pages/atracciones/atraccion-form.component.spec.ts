import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AtraccionFormComponent } from './atraccion-form.component';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Atraccion } from '../../../../core/models/atraccion.model';

describe('AtraccionFormComponent', () => {
  let component: AtraccionFormComponent;
  let fixture: ComponentFixture<AtraccionFormComponent>;
  let atraccionServiceSpy: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let notificationSpy: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };

  const setupComponent = async (data: Atraccion | null = null) => {
    atraccionServiceSpy = {
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
      imports: [AtraccionFormComponent],
      providers: [
        { provide: AtraccionService, useValue: atraccionServiceSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AtraccionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should initialize with empty/default fields in create mode', async () => {
    await setupComponent(null);
    expect(component.isEdit()).toBe(false);
    expect(component.form.get('nombre')?.value).toBe('');
    expect(component.form.get('tipo')?.value).toBe('TEMPORIZADA');
    expect(component.form.valid).toBe(false);
  });

  it('should initialize with existing data in edit mode', async () => {
    const mockAtraccion: Atraccion = {
      id: 5,
      nombre: 'Saltarines Pro',
      tarifaMinuto: 1500,
      capacidadMaxima: 12,
      duracionMinutosBase: 20,
      toleranciaMinutos: 2,
      tipo: 'TEMPORIZADA',
      estado: 'ACTIVO'
    };
    await setupComponent(mockAtraccion);

    expect(component.isEdit()).toBe(true);
    expect(component.form.get('nombre')?.value).toBe('Saltarines Pro');
    expect(component.form.get('tarifaMinuto')?.value).toBe(1500);
    expect(component.form.valid).toBe(true);
  });

  it('should not submit if form is invalid', async () => {
    await setupComponent(null);
    component.form.patchValue({
      nombre: '' // Invalido: nombre obligatorio
    });

    component.onSubmit();
    expect(atraccionServiceSpy.create).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('should call create and close dialog on successful creation', async () => {
    await setupComponent(null);
    atraccionServiceSpy.create.mockReturnValue(of({ id: 10, nombre: 'Nueva Atracción' }));

    component.form.setValue({
      nombre: 'Nueva Atracción',
      tarifaMinuto: 2000,
      capacidadMaxima: 15,
      tipo: 'TEMPORIZADA',
      duracionMinutosBase: 15,
      toleranciaMinutos: 1,
      caidasLimite: 3,
      estado: 'ACTIVO'
    });

    component.onSubmit();

    expect(atraccionServiceSpy.create).toHaveBeenCalled();
    expect(notificationSpy.success).toHaveBeenCalledWith('Atracción Nueva Atracción creada exitosamente.');
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });

  it('should call update and close dialog in edit mode', async () => {
    const mockAtraccion: Atraccion = {
      id: 7,
      nombre: 'Pared Escalada',
      tarifaMinuto: 3000,
      capacidadMaxima: 4,
      duracionMinutosBase: 10,
      tipo: 'EVENTOS_CAIDAS'
    };
    await setupComponent(mockAtraccion);
    atraccionServiceSpy.update.mockReturnValue(of({ id: 7, nombre: 'Pared Escalada Modificada' }));

    component.form.patchValue({ nombre: 'Pared Escalada Modificada' });
    component.onSubmit();

    expect(atraccionServiceSpy.update).toHaveBeenCalledWith(7, expect.objectContaining({
      nombre: 'Pared Escalada Modificada'
    }));
    expect(notificationSpy.success).toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });

  it('should notify error and not close dialog when backend creation fails', async () => {
    await setupComponent(null);
    atraccionServiceSpy.create.mockReturnValue(throwError(() => ({
      error: { mensaje: 'Error de validación en el servidor' }
    })));

    component.form.setValue({
      nombre: 'Atracción Error',
      tarifaMinuto: 2000,
      capacidadMaxima: 10,
      tipo: 'TEMPORIZADA',
      duracionMinutosBase: 15,
      toleranciaMinutos: 1,
      caidasLimite: 3,
      estado: 'ACTIVO'
    });

    component.onSubmit();

    expect(atraccionServiceSpy.create).toHaveBeenCalled();
    expect(notificationSpy.error).toHaveBeenCalledWith('Error de validación en el servidor');
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
    expect(component.loading()).toBe(false);
  });

  it('should change control type when setControlType is called', async () => {
    await setupComponent(null);
    component.setControlType('EVENTOS_CAIDAS');
    expect(component.form.get('tipo')?.value).toBe('EVENTOS_CAIDAS');
  });
});
