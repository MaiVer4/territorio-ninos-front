import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CajaService } from './caja.service';
import { TurnoResponseDTO, AperturaTurnoDTO, CierreTurnoDTO, TurnoCaja } from '../models/caja.model';

describe('CajaService', () => {
  let service: CajaService;
  let httpTesting: HttpTestingController;

  const mockTurnoActivo: TurnoResponseDTO = {
    idTurno: 10,
    usuarioId: 5,
    cajeroNombre: 'Juan Pérez',
    montoInicial: 50000,
    fechaApertura: '2026-10-20T08:00:00Z',
    estado: 'ABIERTO'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CajaService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(CajaService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.turnoActual()).toBeNull();
  });

  describe('obtenerTurnoActivo', () => {
    it('should fetch active turno and update turnoActual signal', () => {
      service.obtenerTurnoActivo().subscribe(turno => {
        expect(turno).toEqual(mockTurnoActivo);
        expect(service.turnoActual()).toEqual(mockTurnoActivo);
      });

      const req = httpTesting.expectOne(request => request.url.endsWith('/turnos/activo'));
      expect(req.request.method).toBe('GET');
      req.flush(mockTurnoActivo);
    });

    it('should return null and set turnoActual to null on error', () => {
      service.obtenerTurnoActivo().subscribe(turno => {
        expect(turno).toBeNull();
        expect(service.turnoActual()).toBeNull();
      });

      const req = httpTesting.expectOne(request => request.url.endsWith('/turnos/activo'));
      expect(req.request.method).toBe('GET');
      req.flush({ message: 'No hay turno activo' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('verificarCajaAbierta', () => {
    it('should return true when active shift state is ABIERTO', () => {
      service.verificarCajaAbierta().subscribe(estaAbierta => {
        expect(estaAbierta).toBe(true);
      });

      const req = httpTesting.expectOne(request => request.url.endsWith('/turnos/activo'));
      req.flush(mockTurnoActivo);
    });

    it('should return false when active shift state is CERRADO', () => {
      service.verificarCajaAbierta().subscribe(estaAbierta => {
        expect(estaAbierta).toBe(false);
      });

      const req = httpTesting.expectOne(request => request.url.endsWith('/turnos/activo'));
      req.flush({ ...mockTurnoActivo, estado: 'CERRADO' });
    });

    it('should return false when no active shift is found (404/null)', () => {
      service.verificarCajaAbierta().subscribe(estaAbierta => {
        expect(estaAbierta).toBe(false);
      });

      const req = httpTesting.expectOne(request => request.url.endsWith('/turnos/activo'));
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('abrirTurno', () => {
    it('should send POST request and update turnoActual signal', () => {
      const aperturaDto: AperturaTurnoDTO = {
        idCaja: 1,
        montoInicial: 100000,
        observaciones: 'Inicio de turno mañana'
      };

      service.abrirTurno(aperturaDto).subscribe(res => {
        expect(res).toEqual(mockTurnoActivo);
        expect(service.turnoActual()).toEqual(mockTurnoActivo);
      });

      const req = httpTesting.expectOne(request => request.url.endsWith('/turnos/abrir'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(aperturaDto);
      req.flush(mockTurnoActivo);
    });
  });

  describe('cerrarTurno', () => {
    it('should send POST request and clear turnoActual signal', () => {
      service.turnoActual.set(mockTurnoActivo);

      const cierreDto: CierreTurnoDTO = {
        idTurno: 10,
        montoFinal: 250000,
        totalEfectivoReal: 250000,
        observaciones: 'Cierre sin novedades'
      };

      const mockCierreResponse: TurnoResponseDTO = {
        ...mockTurnoActivo,
        montoFinal: 250000,
        estado: 'CERRADO'
      };

      service.cerrarTurno(cierreDto).subscribe(res => {
        expect(res.estado).toBe('CERRADO');
        expect(service.turnoActual()).toBeNull();
      });

      const req = httpTesting.expectOne(request => request.url.endsWith('/turnos/cerrar'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(cierreDto);
      req.flush(mockCierreResponse);
    });
  });

  describe('getHistorial', () => {
    it('should fetch shift history without params', () => {
      const mockHistorial: TurnoCaja[] = [
        {
          id: 1,
          idUsuario: 2,
          montoInicial: 50000,
          fechaApertura: '2026-10-19T08:00:00Z',
          estado: 'CERRADO'
        }
      ];

      service.getHistorial().subscribe(res => {
        expect(res.length).toBe(1);
      });

      const req = httpTesting.expectOne(request => request.url.endsWith('/turnos') && !request.params.has('fecha'));
      expect(req.request.method).toBe('GET');
      req.flush(mockHistorial);
    });

    it('should fetch shift history with fecha param', () => {
      service.getHistorial('2026-10-20').subscribe();

      const req = httpTesting.expectOne(request => request.url.endsWith('/turnos') && request.params.get('fecha') === '2026-10-20');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('registrarArqueo', () => {
    it('should send POST request with arqueo result', () => {
      const mockArqueo = {
        idTurno: 10,
        montoEsperado: 200000,
        totalFisico: 200000,
        diferencia: 0,
        estadoBalance: 'CUADRADO' as const,
        desglose: []
      };

      service.registrarArqueo(10, mockArqueo).subscribe(res => {
        expect(res).toEqual(mockArqueo);
      });

      const req = httpTesting.expectOne(request => request.url.endsWith('/turnos/10/arqueo'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockArqueo);
      req.flush(mockArqueo);
    });
  });

  describe('limpiarEstado', () => {
    it('should reset turnoActual to null', () => {
      service.turnoActual.set(mockTurnoActivo);
      expect(service.turnoActual()).not.toBeNull();
      service.limpiarEstado();
      expect(service.turnoActual()).toBeNull();
    });
  });
});
