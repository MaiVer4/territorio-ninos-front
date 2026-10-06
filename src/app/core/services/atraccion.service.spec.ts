import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AtraccionService } from './atraccion.service';
import { Atraccion } from '../models/atraccion.model';

describe('AtraccionService', () => {
  let service: AtraccionService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AtraccionService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AtraccionService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all attractions', () => {
    const mockAtracciones: Atraccion[] = [
      { id: 1, nombre: 'Carrusel Mágico', descripcion: 'Carrusel para niños', tarifaMinuto: 1000, estado: 'ACTIVA' }
    ];

    service.getAll().subscribe(atracciones => {
      expect(atracciones.length).toBe(1);
      expect(atracciones[0].nombre).toBe('Carrusel Mágico');
    });

    const req = httpTesting.expectOne(request => request.url.includes('/atracciones'));
    expect(req.request.method).toBe('GET');
    req.flush(mockAtracciones);
  });
});
