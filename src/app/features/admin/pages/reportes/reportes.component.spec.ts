import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { Chart } from 'chart.js';
import { ReportesComponent } from './reportes.component';
import { ReporteService } from '../../../../core/services/reporte.service';
import { RotacionAtraccion, DatosGraficosReporte } from '../../../../core/models/reporte.model';

describe('ReportesComponent (HU-37.06..08, HU-39.06..08, HU-40.05..08)', () => {
  let component: ReportesComponent;
  let fixture: ComponentFixture<ReportesComponent>;

  const mockRotacion: RotacionAtraccion[] = [
    {
      atraccionId: 1,
      nombre: 'Laberinto Mágico',
      tipo: 'TEMPORIZADA',
      volumenVisitas: 842,
      ocupacionPromedioPorcentaje: 91.5,
      ingresosBrutos: 12630000,
      tiempoPromedioMinutos: 15.2,
      tendenciaPorcentaje: 14.2
    },
    {
      atraccionId: 2,
      nombre: 'Castillo Inflable Gigante',
      tipo: 'TEMPORIZADA',
      volumenVisitas: 735,
      ocupacionPromedioPorcentaje: 84.0,
      ingresosBrutos: 11025000,
      tiempoPromedioMinutos: 20.0,
      tendenciaPorcentaje: 8.5
    },
    {
      atraccionId: 3,
      nombre: 'Toro Mecánico Infantil',
      tipo: 'EVENTOS_CAIDAS',
      volumenVisitas: 620,
      ocupacionPromedioPorcentaje: 78.2,
      ingresosBrutos: 9920000,
      tiempoPromedioMinutos: 6.8,
      tendenciaPorcentaje: 19.4
    },
    {
      atraccionId: 4,
      nombre: 'Muro de Escalar Aventura',
      tipo: 'EVENTOS_CAIDAS',
      volumenVisitas: 390,
      ocupacionPromedioPorcentaje: 52.4, // < 60% baja utilización
      ingresosBrutos: 5850000,
      tiempoPromedioMinutos: 8.0,
      tendenciaPorcentaje: 4.0
    }
  ];

  const mockDatosGraficos: DatosGraficosReporte = {
    ventasPorHora: [
      { hora: '8am', ventasCop: 120000, afluencia: 8 },
      { hora: '9am', ventasCop: 385000, afluencia: 24 }
    ],
    evolucionSemanal: [
      { fecha: '2026-10-26', etiquetaDia: 'Lun', ingresosCop: 2850000 },
      { fecha: '2026-10-27', etiquetaDia: 'Mar', ingresosCop: 3120000 }
    ],
    distribucionMetodosPago: [
      { metodo: 'EFECTIVO', etiqueta: 'Efectivo', montoCop: 18450000, porcentaje: 60.0 },
      { metodo: 'TARJETA_DEBITO', etiqueta: 'Tarjeta Débito', montoCop: 12240000, porcentaje: 40.0 }
    ]
  };

  let reporteServiceMock: any;

  beforeEach(async () => {
    Chart.defaults.animation = false;

    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as any;
    }

    reporteServiceMock = {
      descargandoArchivo: vi.fn().mockReturnValue(false),
      formatoDescargaActivo: vi.fn().mockReturnValue(null),
      obtenerRotacionAtracciones: vi.fn().mockReturnValue(of(mockRotacion)),
      obtenerDatosGraficos: vi.fn().mockReturnValue(of(mockDatosGraficos)),
      descargarReporteFinancieroBlob: vi.fn().mockReturnValue(of(new Blob(['test'], { type: 'text/csv' })))
    };

    await TestBed.configureTestingModule({
      imports: [ReportesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ReporteService, useValue: reporteServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    (Chart.defaults as any).animation = true;
    vi.restoreAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should attempt to render chart during ngOnInit', () => {
    const renderSpy = vi.spyOn(component as any, 'renderChart');
    component.ngOnInit();
    expect(renderSpy).toHaveBeenCalled();
  });

  it('should initialize the chart when canvas 2d context is available', () => {
    const mockGradient = Object.assign(
      Object.create((window as any).CanvasGradient?.prototype || {}),
      {
        addColorStop: vi.fn(),
        toString: () => '[object CanvasGradient]'
      }
    );
    const canvasEl = component.salesCanvas.nativeElement;
    const mockCtx = {
      canvas: canvasEl,
      createLinearGradient: vi.fn().mockReturnValue(mockGradient),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn().mockReturnValue({ data: [] }),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      drawImage: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 0 }),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn()
    };
    Object.setPrototypeOf(mockCtx, (window as any).CanvasRenderingContext2D?.prototype || Object.prototype);

    const getContextSpy = vi.spyOn(canvasEl, 'getContext').mockReturnValue(mockCtx as any);

    // Re-run renderChart
    (component as any).renderChart();

    expect(getContextSpy).toHaveBeenCalledWith('2d');
    expect(mockCtx.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 250);
    expect(mockGradient.addColorStop).toHaveBeenCalledWith(0, 'rgba(249, 115, 22, 0.25)');
    expect(mockGradient.addColorStop).toHaveBeenCalledWith(1, 'rgba(249, 115, 22, 0.0)');
    expect((component as any).chartInstance).toBeInstanceOf(Chart);

    // Also verify ngOnDestroy destroys the chart
    const destroySpy = vi.spyOn((component as any).chartInstance, 'destroy');
    component.ngOnDestroy();
    expect(destroySpy).toHaveBeenCalled();
  });

  it('should call exportToCsv with correct filename, headers and sales rows when exportarCsv is called', () => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let clicked = false;
    let downloadedFilename = '';
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        el.click = () => {
          clicked = true;
          downloadedFilename = el.getAttribute('download') || '';
        };
      }
      return el;
    });

    const today = new Date().toISOString().slice(0, 10);
    component.exportarCsv();

    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(clicked).toBe(true);
    expect(downloadedFilename).toBe(`reporte_ventas_${today}.csv`);

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });

  it('should invoke window.print when exportarPdf is called', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    component.exportarPdf();
    expect(printSpy).toHaveBeenCalled();
  });

  it('should render sales KPI summary cards and alert on low utilization (HU-37.08 / Notion: CA-01, CA-03)', () => {
    fixture.detectChanges();

    const kpiVentas = fixture.debugElement.query(By.css('[data-testid="kpi-total-ventas"]'));
    const kpiTiquetes = fixture.debugElement.query(By.css('[data-testid="kpi-tiquetes-emitidos"]'));
    const kpiPromedio = fixture.debugElement.query(By.css('[data-testid="kpi-ingreso-promedio"]'));
    expect(kpiVentas).toBeTruthy();
    expect(kpiTiquetes).toBeTruthy();
    expect(kpiPromedio).toBeTruthy();

    expect(component.top3Atracciones().length).toBe(3);
    expect(component.top3Atracciones()[0].nombre).toBe('Laberinto Mágico');
    expect(component.top3Atracciones()[1].nombre).toBe('Castillo Inflable Gigante');
    expect(component.top3Atracciones()[2].nombre).toBe('Toro Mecánico Infantil');

    // Low utilization alert (<60%)
    expect(component.atraccionesBajaUtilizacion().length).toBe(1);
    expect(component.atraccionesBajaUtilizacion()[0].nombre).toBe('Muro de Escalar Aventura');

    const alertaBaja = fixture.debugElement.query(By.css('[data-testid="alerta-baja-utilizacion"]'));
    expect(alertaBaja).toBeTruthy();
    expect(alertaBaja.nativeElement.textContent).toContain('Muro de Escalar Aventura (52.4%)');
  });

  it('should sort attraction rotation table dynamically by visits, occupancy and gross revenue (HU-37.07)', () => {
    fixture.detectChanges();

    // Default sorting is by visits descending
    expect(component.criterioOrden()).toBe('visitas');
    expect(component.atraccionesOrdenadas()[0].atraccionId).toBe(1); // 842 visits

    // Sort by occupancy
    component.cambiarCriterioOrden('ocupacionPromedio');
    expect(component.criterioOrden()).toBe('ocupacionPromedio');
    expect(component.atraccionesOrdenadas()[0].ocupacionPromedioPorcentaje).toBe(91.5);

    // Sort by revenue
    component.cambiarCriterioOrden('ingresosBrutos');
    expect(component.criterioOrden()).toBe('ingresosBrutos');
    expect(component.atraccionesOrdenadas()[0].ingresosBrutos).toBe(12630000);
  });

  it('should switch time periods reactively and trigger graph updates (HU-40.08 / Notion: CA-04)', () => {
    fixture.detectChanges();

    component.cambiarPeriodo('ULTIMOS_7_DIAS');
    expect(component.periodoSeleccionado()).toBe('ULTIMOS_7_DIAS');
    expect(reporteServiceMock.obtenerRotacionAtracciones).toHaveBeenCalledWith({
      periodo: 'ULTIMOS_7_DIAS',
      fechaInicio: '',
      fechaFin: ''
    });
    expect(reporteServiceMock.obtenerDatosGraficos).toHaveBeenCalledWith({
      periodo: 'ULTIMOS_7_DIAS',
      fechaInicio: '',
      fechaFin: ''
    });
  });

  it('should trigger blob download via ReporteService when download buttons are invoked (HU-39.06..08)', () => {
    fixture.detectChanges();

    component.descargarCsvBlob();
    expect(reporteServiceMock.descargarReporteFinancieroBlob).toHaveBeenCalledWith('csv');

    component.descargarPdfBlob();
    expect(reporteServiceMock.descargarReporteFinancieroBlob).toHaveBeenCalledWith('pdf');
  });
});
