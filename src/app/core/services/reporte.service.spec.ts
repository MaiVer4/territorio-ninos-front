import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReporteService } from './reporte.service';
import { CajaService } from './caja.service';
import { NotificationService } from './notification.service';
import { of } from 'rxjs';

describe('ReporteService (HU-36.08, HU-37.06, HU-39.07, HU-40.06)', () => {
  let service: ReporteService;
  let httpMock: HttpTestingController;

  let cajaServiceSpy: {
    getHistorial: ReturnType<typeof vi.fn>;
  };
  let notificationServiceSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    cajaServiceSpy = {
      getHistorial: vi.fn().mockReturnValue(of([
        {
          id: 1,
          idUsuario: 10,
          nombreCajero: 'Carlos Gómez',
          montoInicial: 50000,
          montoFinal: 250000,
          totalVentas: 200000,
          fechaApertura: '2026-10-22T08:00:00Z',
          estado: 'CERRADO'
        }
      ]))
    };

    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ReporteService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CajaService, useValue: cajaServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    });

    service = TestBed.inject(ReporteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should be created and have initial idle signals', () => {
    expect(service).toBeTruthy();
    expect(service.descargandoArchivo()).toBe(false);
    expect(service.formatoDescargaActivo()).toBeNull();
  });

  it('should query turnos reconciliation with fallback to CajaService and compute balance difference', () => {
    let turnos: any[] = [];
    service.consultarTurnosConciliacion({ fecha: '2026-10-22' }).subscribe(res => {
      turnos = res;
    });

    const req = httpMock.expectOne(r => r.url.includes('/reportes/turnos'));
    req.error(new ProgressEvent('error'));

    expect(turnos).toBeDefined();
    expect(Array.isArray(turnos)).toBe(true);
    expect(turnos.length).toBe(1);
    expect(turnos[0].cajero).toBe('Carlos Gómez');
    expect(turnos[0].base).toBe(50000);
  });

  it('should return detailed reconciliation with sold tickets (HU-36.11)', () => {
    let detalle: any = null;
    service.obtenerDetalleConciliacionTurno(1).subscribe(res => {
      detalle = res;
    });

    const req = httpMock.expectOne(r => r.url.includes('/reportes/turnos/1/conciliacion'));
    req.error(new ProgressEvent('error'));

    expect(detalle).toBeDefined();
    expect(detalle.turnoId).toBe(1);
    expect(detalle.boletasVendidas.length).toBeGreaterThan(0);
  });

  it('should return attraction rotation metrics (HU-37.05, HU-37.06)', () => {
    let rotacion: any[] = [];
    service.obtenerRotacionAtracciones().subscribe(res => {
      rotacion = res;
    });

    const req = httpMock.expectOne(r => r.url.includes('/reportes/rotacion-atracciones'));
    req.error(new ProgressEvent('error'));

    expect(rotacion).toBeDefined();
    expect(Array.isArray(rotacion)).toBe(true);
    expect(rotacion.length).toBeGreaterThanOrEqual(3);
    expect(rotacion[0].volumenVisitas).toBeGreaterThan(0);
  });

  it('should return graph datasets for hourly sales, 7-day trend and payment methods (HU-40.06..08)', () => {
    let datos: any = null;
    service.obtenerDatosGraficos({ periodo: 'HOY', fechaInicio: '', fechaFin: '' }).subscribe(res => {
      datos = res;
    });

    const req = httpMock.expectOne(r => r.url.includes('/reportes/graficos'));
    req.error(new ProgressEvent('error'));

    expect(datos).toBeDefined();
    expect(datos.ventasPorHora.length).toBe(9);
    expect(datos.evolucionSemanal.length).toBe(7);
    expect(datos.distribucionMetodosPago.length).toBe(4);
  });

  it('should handle blob download and trigger browser save with timestamped name (HU-39.06..08)', () => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    let clicked = false;
    let filename = '';
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = () => {
          clicked = true;
          filename = el.getAttribute('download') || '';
        };
      }
      return el;
    });

    let blob: Blob | null = null;
    service.descargarReporteFinancieroBlob('csv', '2026-11-02').subscribe(b => {
      blob = b;
    });

    const req = httpMock.expectOne(r => r.url.includes('/reportes/descargar'));
    req.error(new ProgressEvent('error'));

    expect(blob).toBeDefined();
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(clicked).toBe(true);
    expect(filename).toBe('reporte_financiero_2026-11-02.csv');
    expect(notificationServiceSpy.success).toHaveBeenCalledWith(
      'Reporte CSV descargado con éxito',
      'Descarga Completada'
    );
    expect(service.descargandoArchivo()).toBe(false);

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });
});
