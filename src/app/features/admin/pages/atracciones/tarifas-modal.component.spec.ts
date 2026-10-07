import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TarifasModalComponent } from './tarifas-modal.component';
import { TarifaService } from '../../../../core/services/tarifa.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { of } from 'rxjs';
import { Atraccion } from '../../../../core/models/atraccion.model';

describe('TarifasModalComponent', () => {
  let component: TarifasModalComponent;
  let fixture: ComponentFixture<TarifasModalComponent>;
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };
  let tarifaServiceSpy: {
    saveTarifaBloque: ReturnType<typeof vi.fn>;
    saveTarifaEvento: ReturnType<typeof vi.fn>;
  };
  let notificationSpy: { success: ReturnType<typeof vi.fn> };

  const mockTimeAtraccion: Atraccion = {
    id: 1,
    nombre: 'Piscina de Pelotas',
    tipo: 'TEMPORIZADA',
    tarifaMinuto: 1000,
    capacidadMaxima: 15,
    duracionMinutosBase: 15
  };

  beforeEach(() => {
    dialogRefSpy = { close: vi.fn() };
    tarifaServiceSpy = {
      saveTarifaBloque: vi.fn().mockReturnValue(of({})),
      saveTarifaEvento: vi.fn().mockReturnValue(of({}))
    };
    notificationSpy = { success: vi.fn() };

    TestBed.configureTestingModule({
      imports: [TarifasModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockTimeAtraccion },
        { provide: TarifaService, useValue: tarifaServiceSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    fixture = TestBed.createComponent(TarifasModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize 3 standard time blocks for TEMPORIZADA', () => {
    expect(component.bloquesArray.length).toBe(3);
    const block15 = component.bloquesArray.at(0).value;
    expect(block15.minutos).toBe(15);
    expect(block15.precio).toBe(15000);
  });

  it('should allow adding a new time block', () => {
    component.addTimeBlock(45, 40000);
    expect(component.bloquesArray.length).toBe(4);
    expect(component.bloquesArray.at(3).value.minutos).toBe(45);
  });

  it('should allow removing a time block if there are more than 1', () => {
    component.removeTimeBlock(1);
    expect(component.bloquesArray.length).toBe(2);
  });

  it('should save time rates and call TarifaService', () => {
    vi.useFakeTimers();
    component.saveTimeRates();
    expect(tarifaServiceSpy.saveTarifaBloque).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(500);
    expect(notificationSpy.success).toHaveBeenCalledWith('Tarifas por tiempo actualizadas correctamente.');
    expect(dialogRefSpy.close).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
