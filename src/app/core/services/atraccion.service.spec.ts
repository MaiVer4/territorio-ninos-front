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
      { id: 1, nombre: 'Carrusel Mágico', descripcion: 'Carrusel para niños', tarifaMinuto: 1000, estado: 'ACTIVO', tipo: 'TEMPORIZADA', capacidadMaxima: 10, duracionMinutosBase: 15 }
    ];

    service.getAll().subscribe(atracciones => {
      expect(atracciones.length).toBe(1);
      expect(atracciones[0].nombre).toBe('Carrusel Mágico');
    });

    const req = httpTesting.expectOne(request => request.url.includes('/atracciones'));
    expect(req.request.method).toBe('GET');
    req.flush(mockAtracciones);
  });

  it('should get attraction by id', () => {
    service.getById(1).subscribe(res => {
      expect(res.id).toBe(1);
      expect(res.nombre).toBe('Carrusel Mágico');
    });

    const req = httpTesting.expectOne(request => request.url.includes('/atracciones/1'));
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1, nombre: 'Carrusel Mágico' });
  });

  it('should create an attraction via POST', () => {
    const newAtraccion: Atraccion = {
      nombre: 'Piscina Pelotas',
      tarifaMinuto: 1500,
      capacidadMaxima: 20,
      duracionMinutosBase: 30,
      tipo: 'TEMPORIZADA'
    };

    service.create(newAtraccion).subscribe(res => {
      expect(res.id).toBe(10);
    });

    const req = httpTesting.expectOne(request => request.url.includes('/atracciones') && !request.url.includes('/1'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newAtraccion);
    req.flush({ ...newAtraccion, id: 10 });
  });

  it('should update attraction via PUT', () => {
    const updateData: Atraccion = {
      id: 2,
      nombre: 'Piscina Actualizada',
      tarifaMinuto: 2000,
      capacidadMaxima: 25,
      duracionMinutosBase: 30,
      tipo: 'TEMPORIZADA'
    };

    service.update(2, updateData).subscribe(res => {
      expect(res.nombre).toBe('Piscina Actualizada');
    });

    const req = httpTesting.expectOne(request => request.url.includes('/atracciones/2'));
    expect(req.request.method).toBe('PUT');
    req.flush(updateData);
  });

  it('should delete attraction via DELETE', () => {
    service.delete(2).subscribe();

    const req = httpTesting.expectOne(request => request.url.includes('/atracciones/2'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should update tolerance minutes via PUT', () => {
    service.updateTolerance(3, 5).subscribe(res => {
      expect(res.toleranciaMinutos).toBe(5);
    });

    const req = httpTesting.expectOne(request => request.url.includes('/atracciones/3/tolerancia'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ toleranciaMinutos: 5 });
    req.flush({ id: 3, toleranciaMinutos: 5 });
  });

  it('should handle HTTP error when request fails', () => {
    let errorResponse: any;
    service.getAll().subscribe({
      next: () => {},
      error: (err) => { errorResponse = err; }
    });

    const req = httpTesting.expectOne(request => request.url.includes('/atracciones'));
    req.flush('Internal Server Error', { status: 500, statusText: 'Server Error' });

    expect(errorResponse.status).toBe(500);
  });
});
