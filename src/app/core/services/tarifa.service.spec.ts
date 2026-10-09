import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TarifaService } from './tarifa.service';
import { TarifaBloque, TarifaEvento } from '../models/tarifa.model';

describe('TarifaService', () => {
  let service: TarifaService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TarifaService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(TarifaService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save a new time block rate', () => {
    const mockTarifa: TarifaBloque = { atraccionId: 1, minutos: 15, precio: 8000 };

    service.saveTarifaBloque(mockTarifa).subscribe(res => {
      expect(res.precio).toBe(8000);
      expect(res.minutos).toBe(15);
    });

    const req = httpTesting.expectOne(request => request.url.includes('/tarifas/bloques'));
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockTarifa, id: 101 });
  });

  it('should save a new event rate', () => {
    const mockEvento: TarifaEvento = { atraccionId: 2, intentos: 3, precio: 10000, descripcion: '3 caídas' };

    service.saveTarifaEvento(mockEvento).subscribe(res => {
      expect(res.intentos).toBe(3);
      expect(res.precio).toBe(10000);
    });

    const req = httpTesting.expectOne(request => request.url.includes('/tarifas/eventos'));
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockEvento, id: 202 });
  });
});
