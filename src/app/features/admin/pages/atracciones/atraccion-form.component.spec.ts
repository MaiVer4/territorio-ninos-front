import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AtraccionFormComponent } from './atraccion-form.component';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { TarifaService } from '../../../../core/services/tarifa.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Atraccion } from '../../../../core/models/atraccion.model';

describe('AtraccionFormComponent', () => {
  let component: AtraccionFormComponent;
  let fixture: ComponentFixture<AtraccionFormComponent>;
  let atraccionServiceSpy: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let tarifaServiceSpy: {
    getTarifasByAtraccion: ReturnType<typeof vi.fn>;
    saveTarifaBloque: ReturnType<typeof vi.fn>;
    saveTarifaEvento: ReturnType<typeof vi.fn>;
    deleteTarifaBloque: ReturnType<typeof vi.fn>;
    deleteTarifaEvento: ReturnType<typeof vi.fn>;
  };
  let notificationSpy: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };

  const setupComponent = async (data: Atraccion | null = null, bloquesIniciales = [{ id: 101, atraccionId: 5, minutos: 15, precio: 15000, vigente: true }]) => {
    atraccionServiceSpy = {
      create: vi.fn(),
      update: vi.fn()
    };
    tarifaServiceSpy = {
      getTarifasByAtraccion: vi.fn().mockReturnValue(of({
        atraccionId: data?.id ?? 0,
        nombreAtraccion: data?.nombre ?? '',
        tipo: data?.tipo ?? 'TEMPORIZADA',
        bloques: bloquesIniciales,
        eventos: []
      })),
      saveTarifaBloque: vi.fn().mockImplementation((b) => of({ ...b, id: b.id ?? 999 })),
      saveTarifaEvento: vi.fn().mockImplementation((e) => of({ ...e, id: e.id ?? 888 })),
      deleteTarifaBloque: vi.fn().mockReturnValue(of(undefined)),
      deleteTarifaEvento: vi.fn().mockReturnValue(of(undefined))
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
        { provide: TarifaService, useValue: tarifaServiceSpy },
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

  it('should load existing tariffs in edit mode and sync added/edited/removed blocks with free minutes and prices', async () => {
    const mockAtraccion: Atraccion = {
      id: 4,
      nombre: 'CASTILLO',
      tarifaMinuto: 1000,
      capacidadMaxima: 10,
      duracionMinutosBase: 15,
      toleranciaMinutos: 1,
      tipo: 'TEMPORIZADA',
      estado: 'ACTIVO'
    };
    await setupComponent(mockAtraccion, [
      { id: 13, atraccionId: 4, minutos: 15, precio: 15000, vigente: true },
      { id: 12, atraccionId: 4, minutos: 30, precio: 30000, vigente: true }
    ]);

    expect(tarifaServiceSpy.getTarifasByAtraccion).toHaveBeenCalledWith(4);
    expect(component.bloquesArray.length).toBe(2);
    expect(component.bloquesArray.at(0).value.minutos).toBe(15);

    // El admin elimina el bloque de 30 min (id: 12), modifica el primero a 12 min libres / $14000 y agrega uno de 25 min / $22000
    component.removeTimeBlock(1);
    component.bloquesArray.at(0).patchValue({ minutos: 12, precio: 14000 });
    component.addTimeBlock(25, 22000);
    component.onTarifasChanged();

    atraccionServiceSpy.update.mockReturnValue(of({ ...mockAtraccion, duracionMinutosBase: 12 }));
    component.onSubmit();

    expect(tarifaServiceSpy.deleteTarifaBloque).toHaveBeenCalledWith(12);
    expect(tarifaServiceSpy.saveTarifaBloque).toHaveBeenCalledWith(
      expect.objectContaining({ id: 13, atraccionId: 4, minutos: 12, precio: 14000 })
    );
    expect(tarifaServiceSpy.saveTarifaBloque).toHaveBeenCalledWith(
      expect.objectContaining({ atraccionId: 4, minutos: 25, precio: 22000 })
    );
  });
});
