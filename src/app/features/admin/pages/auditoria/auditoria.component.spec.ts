import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditoriaComponent } from './auditoria.component';
import { vi } from 'vitest';

describe('AuditoriaComponent', () => {
  let component: AuditoriaComponent;
  let fixture: ComponentFixture<AuditoriaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditoriaComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AuditoriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.logs().length).toBe(0);
    expect(component.countCritical()).toBe(0);
  });

  it('should compute counts by severity and filter logs by search query and severity', () => {
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

    // Toggle same severity resets to 'all'
    component.setFilter('critical');
    expect(component.activeSeverity()).toBe('all');
    expect(component.filteredLogs().length).toBe(3);

    // Filter by search query
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
