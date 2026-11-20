import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReportesAtraccionPanelComponent } from './reportes-atraccion-panel.component';
import { ReporteAtraccionService } from '../../../../core/services/reporte-atraccion.service';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReporteAtraccion } from '../../../../core/models/reporte-atraccion.model';
import * as csvExporter from '../../../../core/utils/csv-exporter';

describe('ReportesAtraccionPanelComponent', () => {
  let component: ReportesAtraccionPanelComponent;
  let fixture: ComponentFixture<ReportesAtraccionPanelComponent>;

  const mockReportes: ReporteAtraccion[] = [
    {
      id: 1,
      atraccionId: 10,
      atraccionNombre: 'Montaña Rusa',
      atraccionEstadoActual: 'FUERA_DE_SERVICIO',
      usuarioReportaId: 1,
      usuarioReportaNombre: 'Carlos Operario',
      tipoReporte: 'DANO',
      severidad: 'CRITICA',
      descripcion: 'Falla en frenos mecánicos de carro 2',
      estado: 'ABIERTO',
      atraccionDesactivada: true,
      fechaReporte: '2026-11-19T10:00:00'
    },
    {
      id: 2,
      atraccionId: 11,
      atraccionNombre: 'Piscina de Pelotas',
      atraccionEstadoActual: 'ACTIVO',
      usuarioReportaId: 2,
      usuarioReportaNombre: 'Ana Operaria',
      tipoReporte: 'FALTA_SUPLEMENTOS',
      severidad: 'MEDIA',
      descripcion: 'Faltan 200 pelotas para completar nivel mínimo',
      estado: 'RESUELTO',
      atraccionDesactivada: false,
      fechaReporte: '2026-11-19T09:00:00',
      fechaResolucion: '2026-11-19T11:00:00',
      usuarioResuelveNombre: 'Admin',
      observacionesResolucion: 'Se surtieron pelotas de bodega'
    }
  ];

  let reporteServiceMock: any;
  let atraccionServiceMock: any;
  let notificationServiceMock: any;

  beforeEach(async () => {
    reporteServiceMock = {
      listar: vi.fn().mockReturnValue(of(mockReportes)),
      crear: vi.fn().mockReturnValue(of({
        id: 3,
        atraccionId: 10,
        atraccionNombre: 'Montaña Rusa',
        usuarioReportaNombre: 'Admin',
        tipoReporte: 'DANO',
        severidad: 'ALTA',
        descripcion: 'Desgaste en cinturón de seguridad',
        estado: 'ABIERTO',
        atraccionDesactivada: false,
        fechaReporte: '2026-11-19T12:00:00'
      })),
      actualizarEstado: vi.fn().mockReturnValue(of({
        ...mockReportes[0],
        estado: 'RESUELTO',
        fechaResolucion: '2026-11-19T13:00:00',
        observacionesResolucion: 'Novedad resuelta y atracción reactivada'
      }))
    };

    atraccionServiceMock = {
      getAll: vi.fn().mockReturnValue(of([
        { id: 10, nombre: 'Montaña Rusa', estado: 'FUERA_DE_SERVICIO' },
        { id: 11, nombre: 'Piscina de Pelotas', estado: 'ACTIVO' }
      ]))
    };

    notificationServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ReportesAtraccionPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ReporteAtraccionService, useValue: reporteServiceMock },
        { provide: AtraccionService, useValue: atraccionServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportesAtraccionPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize and load reports and attractions', () => {
    expect(component).toBeTruthy();
    expect(reporteServiceMock.listar).toHaveBeenCalled();
    expect(atraccionServiceMock.getAll).toHaveBeenCalled();
    expect(component.reportes().length).toBe(2);
  });

  it('should emit conteoPendientesChange with count of non-resolved reports', () => {
    let conteoEmitido = -1;
    component.conteoPendientesChange.subscribe(c => (conteoEmitido = c));

    // Re-trigger load
    component.cargarReportes();
    expect(conteoEmitido).toBe(1); // Only mockReportes[0] is ABIERTO
  });

  it('should create new report and update pending count and list', () => {
    let conteoEmitido = -1;
    component.conteoPendientesChange.subscribe(c => (conteoEmitido = c));

    component.atraccionIdSeleccionada.set(10);
    component.descripcion.set('Desgaste en cinturón de seguridad');
    component.severidad.set('ALTA');
    component.tipoReporte.set('DANO');

    component.enviarReporte();

    expect(reporteServiceMock.crear).toHaveBeenCalledWith({
      atraccionId: 10,
      tipoReporte: 'DANO',
      severidad: 'ALTA',
      descripcion: 'Desgaste en cinturón de seguridad',
      desactivarAtraccion: false
    });
    expect(component.reportes().length).toBe(3);
    expect(conteoEmitido).toBe(2); // 1 previous + 1 new = 2 open
  });

  it('should resolve report and reactivate attraction when requested', () => {
    let estadoEmitido = false;
    component.atraccionEstadoModificado.subscribe(() => (estadoEmitido = true));

    component.cambiarEstadoReporte(mockReportes[0], 'RESUELTO', true);

    expect(reporteServiceMock.actualizarEstado).toHaveBeenCalledWith(1, {
      estado: 'RESUELTO',
      observacionesResolucion: 'Novedad resuelta y atracción reactivada',
      reactivarAtraccion: true
    });
    expect(estadoEmitido).toBe(true);
    expect(notificationServiceMock.success).toHaveBeenCalledWith('Reporte resuelto y atracción reactivada.');
  });

  it('should export reports to CSV using exportToCsv', () => {
    const exportSpy = vi.spyOn(csvExporter, 'exportToCsv').mockImplementation(() => {});

    component.exportarCsv();

    expect(exportSpy).toHaveBeenCalled();
    const args = exportSpy.mock.calls[0];
    expect(args[0]).toContain('auditoria_novedades_');
    expect(args[1]).toEqual([
      'ID',
      'Fecha Reporte',
      'Atracción',
      'Tipo Novedad',
      'Severidad',
      'Estado',
      'Fuera de Servicio',
      'Reportado Por',
      'Descripción',
      'Fecha Resolución',
      'Resuelto Por',
      'Observaciones Resolución'
    ]);
    expect(args[2].length).toBe(2);
  });
});
