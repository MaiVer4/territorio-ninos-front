import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminDashboardComponent } from './dashboard.component';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { AsignacionService } from '../../../../core/services/asignacion.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { of } from 'rxjs';
import { Atraccion } from '../../../../core/models/atraccion.model';
import { AsignacionOperario } from '../../../../core/models/asignacion.model';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;

  const mockAtracciones: Atraccion[] = [
    {
      id: 1,
      nombre: 'Piscina Grande',
      tipo: 'TEMPORIZADA',
      tarifaMinuto: 1000,
      capacidadMaxima: 20,
      duracionMinutosBase: 30,
      ninosActivos: 10,
      estado: 'ACTIVO'
    }
  ];

  const mockAsignaciones: AsignacionOperario[] = [
    {
      id: 50,
      atraccionId: 1,
      operarioId: 7,
      operarioNombre: 'María Torres',
      activo: true
    }
  ];

  let atraccionServiceSpy: { getAll: ReturnType<typeof vi.fn> };
  let asignacionServiceSpy: { getActiveAssignments: ReturnType<typeof vi.fn> };
  let wsService: WebSocketService;

  beforeEach(() => {
    atraccionServiceSpy = { getAll: vi.fn().mockReturnValue(of(mockAtracciones)) };
    asignacionServiceSpy = { getActiveAssignments: vi.fn().mockReturnValue(of(mockAsignaciones)) };

    TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AtraccionService, useValue: atraccionServiceSpy },
        { provide: AsignacionService, useValue: asignacionServiceSpy },
        WebSocketService
      ]
    });

    wsService = TestBed.inject(WebSocketService);
    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load active attractions with assigned operator', () => {
    expect(component).toBeTruthy();
    expect(component.atraccionesDb().length).toBe(1);
    expect(component.atraccionesDb()[0].operarioAsignado).toBe('María Torres');
  });

  it('should calculate occupancy percentage and colors according to thresholds (HU-11)', () => {
    const a = component.atraccionesDb()[0];
    expect(component.getOccupancyPct(a)).toBe(50); // 10/20 = 50%
    expect(component.getProgressColor(50)).toBe('bg-emerald-500'); // <70%

    expect(component.getProgressColor(85)).toBe('bg-amber-500'); // 70-99%
    expect(component.getStatusLabel(85)).toBe('Alta ocupación');

    expect(component.getProgressColor(100)).toBe('bg-rose-500'); // 100%
    expect(component.getStatusLabel(100)).toBe('Lleno (100%)');
  });

  it('should react to WebSocket live occupancy events (HU-11 realtime)', () => {
    wsService.emitOccupancyEvent({
      atraccionId: 1,
      ninosActivos: 20,
      operarioNombre: 'María Torres'
    });

    const updated = component.atraccionesDb()[0];
    expect(updated.ninosActivos).toBe(20);
    expect(component.getOccupancyPct(updated)).toBe(100);
    expect(component.getProgressColor(100)).toBe('bg-rose-500');
  });
});
