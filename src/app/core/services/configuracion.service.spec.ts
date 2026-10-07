import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfiguracionService } from './configuracion.service';
import { ConfiguracionParque } from '../models/configuracion.model';

describe('ConfiguracionService', () => {
  let service: ConfiguracionService;
  let httpTesting: HttpTestingController;

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ConfiguracionService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ConfiguracionService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get park configuration', () => {
    service.getConfiguracion().subscribe(res => {
      expect(res.nombreComercial).toBe('Territorio de Niños');
      expect(res.ciudad).toBe('Armenia, Quindío');
      expect(res.anchoPapelMm).toBe(80);
    });

    const req = httpTesting.expectOne('http://localhost:8080/territorioninos/api/configuracion');
    expect(req.request.method).toBe('GET');
    req.flush(mockConfig);
  });

  it('should update park configuration', () => {
    service.updateConfiguracion(mockConfig).subscribe(res => {
      expect(res.nit).toBe('901.458.789-2');
    });

    const req = httpTesting.expectOne('http://localhost:8080/territorioninos/api/configuracion');
    expect(req.request.method).toBe('PUT');
    req.flush(mockConfig);
  });
});
