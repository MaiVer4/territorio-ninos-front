import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TurnosComponent } from './turnos.component';
import { CajaService } from '../../../../core/services/caja.service';
import { ReporteService } from '../../../../core/services/reporte.service';
import { ReporteTurno } from '../../../../core/models/reporte.model';
import { By } from '@angular/platform-browser';

describe('TurnosComponent (HU-36.09..11, HU-39.06..08)', () => {
  let component: TurnosComponent;
  let fixture: ComponentFixture<TurnosComponent>;

  let cajaServiceSpy: { getHistorial: ReturnType<typeof vi.fn> };
  let reporteServiceSpy: {
    consultarTurnosConciliacion: ReturnType<typeof vi.fn>;
    obtenerDetalleConciliacionTurno: ReturnType<typeof vi.fn>;
    descargarReporteFinancieroBlob: ReturnType<typeof vi.fn>;
    descargandoArchivo: ReturnType<typeof vi.fn>;
    formatoDescargaActivo: ReturnType<typeof vi.fn>;
  };

  const mockReporteTurnos: ReporteTurno[] = [
    {
      id: 1,
      idUsuario: 10,
      cajero: 'Carlos Gómez',
      rol: 'Taquillero',
      apertura: '2026-10-22T08:00:00Z',
      cierre: '2026-10-22T17:00:00Z',
      base: 50000,
      efectivo: 150000,
      electronico: 50000,
      ventas: 200000,
      esperado: 200000,
      fisico: 200000,
      diferencia: 0,
      tieneDescuadre: false,
      tiquetes: 12,
      activo: true
    },
    {
      id: 2,
      idUsuario: 11,
      cajero: 'Mariana López',
      rol: 'Taquillero',
      apertura: '2026-10-22T09:00:00Z',
      cierre: '2026-10-22T18:00:00Z',
      base: 40000,
      efectivo: 100000,
      electronico: 10000,
      ventas: 110000,
      esperado: 140000,
      fisico: 120000,
      diferencia: -20000, // Descuadre faltante (HU-36.10)
      tieneDescuadre: true,
      tiquetes: 8,
      activo: false
    }
  ];

  beforeEach(async () => {
    cajaServiceSpy = {
      getHistorial: vi.fn().mockReturnValue(of([]))
    };

    reporteServiceSpy = {
      consultarTurnosConciliacion: vi.fn().mockReturnValue(of(mockReporteTurnos)),
      obtenerDetalleConciliacionTurno: vi.fn().mockReturnValue(of({
        turnoId: 2,
        boletasVendidas: [
          {
            idBoleta: 'B1',
            codigoBoleta: 'BOL-001',
            uuid: 'u-1',
            horaVenta: '09:30 AM',
            atraccionNombre: 'Laberinto Mágico',
            menorNombre: 'Lucas',
            metodoPago: 'EFECTIVO',
            valor: 15000
          }
        ]
      })),
      descargarReporteFinancieroBlob: vi.fn().mockReturnValue(of(new Blob())),
      descargandoArchivo: vi.fn().mockReturnValue(false),
      formatoDescargaActivo: vi.fn().mockReturnValue(null)
    };

    await TestBed.configureTestingModule({
      imports: [TurnosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CajaService, useValue: cajaServiceSpy },
        { provide: ReporteService, useValue: reporteServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TurnosComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load shift history and map accounting reconciliation fields on init (HU-36.09, HU-36.10)', () => {
    fixture.detectChanges();

    expect(reporteServiceSpy.consultarTurnosConciliacion).toHaveBeenCalled();
    expect(component.turnos().length).toBe(2);

    const first = component.turnos()[0];
    expect(first.cajero).toBe('Carlos Gómez');
    expect(first.base).toBe(50000);
    expect(first.ventas).toBe(200000);
    expect(first.diferencia).toBe(0);
    expect(first.tieneDescuadre).toBe(false);

    const second = component.turnos()[1];
    expect(second.cajero).toBe('Mariana López');
    expect(second.diferencia).toBe(-20000);
    expect(second.tieneDescuadre).toBe(true);
  });

  it('should highlight shifts with cash discrepancy in red (HU-36.10 / CA-03)', () => {
    fixture.detectChanges();

    const filaDescuadre = fixture.debugElement.query(By.css('[data-testid="fila-turno-descuadre-2"]'));
    expect(filaDescuadre).toBeTruthy();
    expect(filaDescuadre.nativeElement.classList.contains('bg-red-50/80') || filaDescuadre.nativeElement.className.includes('red')).toBe(true);
    expect(filaDescuadre.nativeElement.textContent).toContain('-$20.000');
  });

  it('should filter turnos by cashier name reactively (HU-36.09)', () => {
    fixture.detectChanges();

    component.filtroCajero = 'Mariana';
    fixture.detectChanges();

    expect(component.turnosFiltrados().length).toBe(1);
    expect(component.turnosFiltrados()[0].cajero).toBe('Mariana López');
  });

  it('should open detailed audit modal and list sold tickets (HU-36.11 / CA-04)', () => {
    fixture.detectChanges();

    const btnAuditar = fixture.debugElement.query(By.css('[data-testid="btn-auditar-turno-2"]'));
    expect(btnAuditar).toBeTruthy();

    btnAuditar.nativeElement.click();
    fixture.detectChanges();

    expect(reporteServiceSpy.obtenerDetalleConciliacionTurno).toHaveBeenCalledWith(2);
    expect(component.turnoSeleccionadoParaAuditoria()).toBeTruthy();

    const modal = fixture.debugElement.query(By.css('[data-testid="modal-detalle-conciliacion-turno"]'));
    expect(modal).toBeTruthy();
    expect(modal.nativeElement.textContent).toContain('Auditoría de Turno #2');
    expect(modal.nativeElement.textContent).toContain('BOL-001');
    expect(modal.nativeElement.textContent).toContain('Laberinto Mágico');

    component.cerrarModalDetalleTurno();
    fixture.detectChanges();
    expect(component.turnoSeleccionadoParaAuditoria()).toBeNull();
  });

  it('should trigger blob download for CSV and PDF (HU-39.06..08)', () => {
    fixture.detectChanges();

    component.exportarCsv();
    expect(reporteServiceSpy.descargarReporteFinancieroBlob).toHaveBeenCalledWith('csv', component.fechaSeleccionada);

    component.exportarPdf();
    expect(reporteServiceSpy.descargarReporteFinancieroBlob).toHaveBeenCalledWith('pdf', component.fechaSeleccionada);
  });
});
