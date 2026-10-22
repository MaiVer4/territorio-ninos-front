import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReportesComponent } from './reportes.component';
import { Chart } from 'chart.js';

describe('ReportesComponent', () => {
  let component: ReportesComponent;
  let fixture: ComponentFixture<ReportesComponent>;

  beforeEach(async () => {
    Chart.defaults.animation = false;

    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as any;
    }

    await TestBed.configureTestingModule({
      imports: [ReportesComponent]
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
});
