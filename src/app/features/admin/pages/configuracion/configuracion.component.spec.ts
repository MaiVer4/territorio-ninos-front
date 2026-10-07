import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfiguracionComponent } from './configuracion.component';
import { ConfiguracionService } from '../../../../core/services/configuracion.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { of } from 'rxjs';
import { ConfiguracionParque } from '../../../../core/models/configuracion.model';

describe('ConfiguracionComponent', () => {
  let component: ConfiguracionComponent;
  let fixture: ComponentFixture<ConfiguracionComponent>;

  const mockConfig: ConfiguracionParque = {
    id: 1,
    nombreComercial: 'Territorio de Niños',
    razonSocial: 'Territorio de Niños S.A.S.',
    nit: '901.458.789-2',
    direccion: 'Av. Bolívar # 14N-55',
    telefono: '+57 310 456 7890',
    ciudad: 'Armenia, Quindío',
    politicasSeguridad: 'Uso obligatorio de medias antideslizantes.',
    anchoPapelMm: 80,
    mensajePie: '¡Gracias por su visita!'
  };

  let configServiceSpy: {
    getConfiguracion: ReturnType<typeof vi.fn>;
    updateConfiguracion: ReturnType<typeof vi.fn>;
  };
  let notificationSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    configServiceSpy = {
      getConfiguracion: vi.fn().mockReturnValue(of(mockConfig)),
      updateConfiguracion: vi.fn().mockReturnValue(of(mockConfig))
    };
    notificationSpy = {
      success: vi.fn(),
      error: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [ConfiguracionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfiguracionService, useValue: configServiceSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    fixture = TestBed.createComponent(ConfiguracionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created and load configuration', () => {
    expect(component).toBeTruthy();
    expect(configServiceSpy.getConfiguracion).toHaveBeenCalled();
    expect(component.form.get('nombreComercial')?.value).toBe('Territorio de Niños');
    expect(component.form.get('nit')?.value).toBe('901.458.789-2');
  });

  it('should prevent submission when required fields are empty (Escenario 2 HU-13)', () => {
    component.form.patchValue({ nombreComercial: '', nit: '' });
    component.onSubmit();

    expect(configServiceSpy.updateConfiguracion).not.toHaveBeenCalled();
    expect(notificationSpy.error).toHaveBeenCalledWith('Debes completar todos los campos obligatorios del establecimiento.');
  });

  it('should submit successfully when form is valid (Escenario 1 HU-13)', () => {
    component.form.patchValue({
      nombreComercial: 'Territorio de Niños Armenia',
      nit: '901.458.789-2'
    });

    component.onSubmit();
    expect(configServiceSpy.updateConfiguracion).toHaveBeenCalled();
    expect(notificationSpy.success).toHaveBeenCalledWith('Parámetros del parque y boletas guardados exitosamente.');
  });

  it('should dynamically update previewConfig when form values change', () => {
    component.form.patchValue({ nombreComercial: 'Nuevo Parque TDN' });
    expect(component.previewConfig().nombreComercial).toBe('Nuevo Parque TDN');
  });
});
