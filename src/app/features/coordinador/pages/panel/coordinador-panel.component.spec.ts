import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CoordinadorPanelComponent } from './coordinador-panel.component';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { WebSocketService, OccupancyEvent } from '../../../../core/services/websocket.service';
import { ReporteAtraccionService } from '../../../../core/services/reporte-atraccion.service';
import { Atraccion } from '../../../../core/models/atraccion.model';

describe('CoordinadorPanelComponent', () => {
  let fixture: ComponentFixture<CoordinadorPanelComponent>;
  let component: CoordinadorPanelComponent;
  let atraccionServiceSpy: any;
  let notificationSpy: any;
  let wsSubject: Subject<OccupancyEvent>;

  const mockAtracciones: Atraccion[] = [
    { id: 1, nombre: 'Piscina de Pelotas', tipo: 'TEMPORIZADA', estado: 'ACTIVO', capacidadMaxima: 15, ocupacionActiva: 4, tarifaMinuto: 100, duracionMinutosBase: 15 },
    { id: 2, nombre: 'Toro Mecánico', tipo: 'EVENTOS_CAIDAS', estado: 'FUERA_DE_SERVICIO', capacidadMaxima: 1, ocupacionActiva: 0, tarifaMinuto: 0, duracionMinutosBase: 5 }
  ];

  beforeEach(async () => {
    wsSubject = new Subject<OccupancyEvent>();
    atraccionServiceSpy = {
      getAll: vi.fn().mockReturnValue(of(mockAtracciones)),
      cambiarEstado: vi.fn().mockImplementation((id: number, estado: string) =>
        of({ ...mockAtracciones.find(a => a.id === id), estado })
      )
    };
    notificationSpy = {
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CoordinadorPanelComponent],
      providers: [
        provideRouter([]),
        { provide: AtraccionService, useValue: atraccionServiceSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: ReporteAtraccionService, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        {
          provide: AuthService,
          useValue: {
            currentUserName: signal('Carlos Coord'),
            currentUserInitials: signal('CC'),
            logout: vi.fn()
          }
        },
        {
          provide: WebSocketService,
          useValue: { conectarDashboardAdmin: vi.fn().mockReturnValue(wsSubject.asObservable()) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CoordinadorPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load attractions and compute KPI counts', () => {
    expect(component.atracciones().length).toBe(2);
    expect(component.totalActivas()).toBe(1);
    expect(component.totalFueraDeServicio()).toBe(1);
    expect(component.totalOcupacion()).toBe(4);
  });

  it('should toggle an active attraction to FUERA_DE_SERVICIO', () => {
    component.toggleEstadoAtraccion(mockAtracciones[0]);
    expect(atraccionServiceSpy.cambiarEstado).toHaveBeenCalledWith(1, 'FUERA_DE_SERVICIO');
    expect(component.atracciones()[0].estado).toBe('FUERA_DE_SERVICIO');
    expect(notificationSpy.warn).toHaveBeenCalled();
  });

  it('should reactivate a FUERA_DE_SERVICIO attraction to ACTIVO', () => {
    component.toggleEstadoAtraccion(mockAtracciones[1]);
    expect(atraccionServiceSpy.cambiarEstado).toHaveBeenCalledWith(2, 'ACTIVO');
    expect(component.atracciones()[1].estado).toBe('ACTIVO');
    expect(notificationSpy.success).toHaveBeenCalled();
  });

  it('should switch to reports tab with selected attraction when clicking reportar', () => {
    component.abrirReportePara(mockAtracciones[0]);
    expect(component.tabActiva()).toBe('REPORTES');
    expect(component.atraccionParaReporte()).toBe(1);
  });
});
