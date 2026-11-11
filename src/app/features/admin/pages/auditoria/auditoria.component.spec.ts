import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuditoriaComponent } from './auditoria.component';
import { AuditoriaService } from '../../../../core/services/auditoria.service';
import {
  AuditoriaTicket,
  IncidenteOperativo
} from '../../../../core/models/auditoria.model';

describe('AuditoriaComponent (HU-38.07..10, HU-41.05..08)', () => {
  let component: AuditoriaComponent;
  let fixture: ComponentFixture<AuditoriaComponent>;

  const mockExpediente: AuditoriaTicket = {
    ticketId: 'TCK-9901',
    ticketUuid: 'b2c3d4e5-f6a1-4b2c-9d3e-234567890bcd',
    codigoBoleta: 'BOL-849201',
    menorNombre: 'Sofía Gómez',
    adultoResponsable: 'Andrés Gómez',
    adultoDocumento: '1094857291',
    atraccionNombre: 'Laberinto Mágico',
    estadoActual: 'CONSUMIDO',
    eventos: [
      {
        idEvento: 'EVT-1',
        tipoHito: 'VENTA_CAJA',
        tituloHito: 'Emisión en Taquilla',
        descripcion: 'Venta presencial',
        timestamp: '2026-11-02 09:15:00',
        metadatos: {
          cajeroEmisor: 'Carlos Gómez',
          estacionFisica: 'Caja Principal 01',
          direccionIpTerminal: '192.168.10.15'
        }
      },
      {
        idEvento: 'EVT-2',
        tipoHito: 'ESCANEO_ACCESO',
        tituloHito: 'Ingreso al Juego',
        descripcion: 'Validación QR exitosa',
        timestamp: '2026-11-02 09:25:00',
        metadatos: {
          operarioValidador: 'Juan Reyes',
          estacionFisica: 'Estación Molinete 01',
          direccionIpTerminal: '192.168.10.22'
        }
      }
    ]
  };

  const mockIncidentes: IncidenteOperativo[] = [
    {
      idIncidente: 'INC-1',
      id: 'INC-1',
      atraccionNombre: 'Laberinto Mágico',
      atraccion: 'Laberinto Mágico',
      estacionFisica: 'Estación Molinete 01',
      operarioNombre: 'Juan Reyes',
      operario: 'Juan Reyes',
      fechaHoraInicio: '2026-11-02 10:15:00',
      timestamp: '2026-11-02 10:15:00',
      severidad: 'BAJA',
      motivoJustificado: 'Limpieza rutinaria',
      motivo: 'Limpieza rutinaria',
      duracionMinutos: 3,
      superaUmbralCincoMinutos: false
    },
    {
      idIncidente: 'INC-2',
      id: 'INC-2',
      atraccionNombre: 'Castillo Inflable',
      atraccion: 'Castillo Inflable',
      estacionFisica: 'Zona 2 Entrada',
      operarioNombre: 'María Pérez',
      operario: 'María Pérez',
      fechaHoraInicio: '2026-11-02 11:30:00',
      timestamp: '2026-11-02 11:30:00',
      severidad: 'MEDIA',
      motivoJustificado: 'Ajuste de presión de aire turbina',
      motivo: 'Ajuste de presión de aire turbina',
      duracionMinutos: 9,
      superaUmbralCincoMinutos: true
    }
  ];

  let auditoriaServiceMock: any;

  beforeEach(async () => {
    auditoriaServiceMock = {
      validarFormatoBusqueda: vi.fn((termino: string) => {
        const clean = (termino || '').trim();
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean)) {
          return { esValido: true, tipo: 'UUID', terminoSanitizado: clean };
        }
        if (/^\d{6,12}$/.test(clean)) {
          return { esValido: true, tipo: 'CEDULA', terminoSanitizado: clean };
        }
        return {
          esValido: false,
          tipo: 'INVALIDO',
          terminoSanitizado: clean,
          mensajeError: 'Formato inválido: ingrese UUID v4 o Cédula (6-12 dígitos numéricos).'
        };
      }),
      buscarExpedienteTicket: vi.fn().mockReturnValue(of(mockExpediente)),
      obtenerIncidentesYPausas: vi.fn().mockReturnValue(of(mockIncidentes)),
      obtenerResumenInactividad: vi.fn().mockReturnValue({
        tiempoTotalSuspensionMinutos: 12,
        pausasMayoresACincoMinutos: 1,
        promedioMinutosPausadosPorJuego: 6,
        promedioMinutosPausadosPorOperario: 6
      })
    };

    await TestBed.configureTestingModule({
      imports: [AuditoriaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuditoriaService, useValue: auditoriaServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuditoriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create and initialize in tab expediente with empty logs', () => {
    expect(component).toBeTruthy();
    expect(component.activeTab()).toBe('expediente');
    expect(component.logs().length).toBe(0);
    expect(component.countCritical()).toBe(0);
  });

  it('should validate ticket search term and fetch ticket dossier (HU-38.08..10 / Notion: CA-01, CA-02)', () => {
    // 1. Invalid search term
    component.terminoBusquedaTicket.set('invalid%%');
    fixture.detectChanges();

    const errorMsg = fixture.debugElement.query(By.css('[data-testid="error-validacion-busqueda"]'));
    expect(errorMsg).toBeTruthy();
    expect(errorMsg.nativeElement.textContent).toContain('Formato inválido');

    // 2. Valid search term (cédula)
    component.terminoBusquedaTicket.set('1094857291');
    fixture.detectChanges();

    const btnBuscar = fixture.debugElement.query(By.css('[data-testid="btn-buscar-expediente"]'));
    expect(btnBuscar).toBeTruthy();
    btnBuscar.nativeElement.click();
    fixture.detectChanges();

    expect(auditoriaServiceMock.buscarExpedienteTicket).toHaveBeenCalledWith('1094857291');
    expect(component.expedienteSeleccionado()).toBeTruthy();
    expect(component.expedienteSeleccionado()?.codigoBoleta).toBe('BOL-849201');

    // Timeline component should now be rendered
    const timelineEl = fixture.debugElement.query(By.css('app-ticket-timeline'));
    expect(timelineEl).toBeTruthy();
  });

  it('should display incident KPIs and highlight pauses > 5min in amber (HU-41.06..08 / Notion: CA-02..04)', () => {
    // Switch to incident monitoring tab
    component.activeTab.set('incidentes');
    fixture.detectChanges();

    // KPI widgets
    const kpiTotal = fixture.debugElement.query(By.css('[data-testid="kpi-tiempo-total-suspension"]'));
    expect(kpiTotal).toBeTruthy();
    expect(kpiTotal.nativeElement.textContent).toContain('12 min');

    const kpiMayores5 = fixture.debugElement.query(By.css('[data-testid="kpi-pausas-mayores-5min"]'));
    expect(kpiMayores5).toBeTruthy();
    expect(kpiMayores5.nativeElement.textContent).toContain('1');

    // Table rows
    const filaNormal = fixture.debugElement.query(By.css('[data-testid="fila-incidente-INC-1"]'));
    expect(filaNormal).toBeTruthy();

    const filaProlongada = fixture.debugElement.query(By.css('[data-testid="fila-pausa-prolongada-INC-2"]'));
    expect(filaProlongada).toBeTruthy();
    expect(filaProlongada.nativeElement.textContent).toContain('9 min');
    expect(filaProlongada.nativeElement.className).toContain('amber');
  });

  it('should maintain backward compatibility for Bitácora de Logs and filters', () => {
    component.activeTab.set('logs');
    fixture.detectChanges();

    component.logs.set([
      {
        id: 'aud-1',
        timestamp: '2026-10-09 10:00',
        type: 'time_exceeded',
        attraction: 'Piscina de Pelotas',
        operator: 'Carlos Gómez',
        description: 'Menor excedió tiempo por 5 minutos',
        severity: 'warning'
      },
      {
        id: 'aud-2',
        timestamp: '2026-10-09 11:30',
        type: 'ticket_rejected',
        attraction: 'Carrusel Mágico',
        operator: 'María Pérez',
        description: 'Tiquete ya utilizado previamente',
        severity: 'critical'
      },
      {
        id: 'aud-3',
        timestamp: '2026-10-09 12:00',
        type: 'manual_access',
        attraction: 'Zona Blanda',
        operator: 'Carlos Gómez',
        description: 'Acceso autorizado por supervisión',
        severity: 'info'
      }
    ]);

    expect(component.countCritical()).toBe(1);
    expect(component.countWarning()).toBe(1);
    expect(component.countInfo()).toBe(1);

    // Filter by severity
    component.setFilter('critical');
    expect(component.filteredLogs().length).toBe(1);
    expect(component.filteredLogs()[0].id).toBe('aud-2');

    // Reset severity
    component.setFilter('critical');
    expect(component.activeSeverity()).toBe('all');
    expect(component.filteredLogs().length).toBe(3);

    // Filter by query
    component.searchQuery.set('carlos');
    expect(component.filteredLogs().length).toBe(2);

    // Filter by date
    component.searchQuery.set('');
    component.filterDate.set('2026-10-09');
    expect(component.filteredLogs().length).toBe(3);

    component.filterDate.set('2026-10-10');
    expect(component.filteredLogs().length).toBe(0);
  });

  it('should call exportToCsv when exportarCsv is invoked with logs', () => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    component.logs.set([
      {
        id: 'aud-1',
        timestamp: '2026-10-09 10:00',
        type: 'time_exceeded',
        attraction: 'Piscina de Pelotas',
        operator: 'Carlos Gómez',
        description: 'Alerta tiempo',
        severity: 'warning'
      }
    ]);

    component.exportarCsv();
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:mock-url');

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });
});
