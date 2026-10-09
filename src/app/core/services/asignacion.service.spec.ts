import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AsignacionService } from './asignacion.service';
import { AsignacionOperario } from '../models/asignacion.model';

describe('AsignacionService', () => {
  let service: AsignacionService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AsignacionService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AsignacionService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get active assignments', () => {
    const mockList: AsignacionOperario[] = [
      { id: 1, atraccionId: 10, operarioId: 5, operarioNombre: 'Carlos Gómez', activo: true }
    ];

    service.getActiveAssignments().subscribe(res => {
      expect(res.length).toBe(1);
      expect(res[0].operarioNombre).toBe('Carlos Gómez');
    });

    const req = httpTesting.expectOne(request => request.url.includes('/asignaciones/activas'));
    expect(req.request.method).toBe('GET');
    req.flush(mockList);
  });

  it('should assign operator to attraction', () => {
    service.assignOperator(10, 5, false).subscribe(res => {
      expect(res.atraccionId).toBe(10);
      expect(res.operarioId).toBe(5);
    });

    const req = httpTesting.expectOne(request => request.url.includes('/asignaciones') && !request.url.includes('/activas'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ atraccionId: 10, operarioId: 5, forzarReasignacion: false });
    req.flush({ id: 1, atraccionId: 10, operarioId: 5, activo: true });
  });
});
