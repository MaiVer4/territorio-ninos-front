import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TurnosComponent } from './turnos.component';
import { CajaService } from '../../../../core/services/caja.service';
import { TurnoCaja } from '../../../../core/models/caja.model';

describe('TurnosComponent', () => {
  let component: TurnosComponent;
  let fixture: ComponentFixture<TurnosComponent>;
  let cajaServiceSpy: { getHistorial: ReturnType<typeof vi.fn> };

  const mockTurnosCaja: TurnoCaja[] = [
    {
      id: 1,
      idCaja: 1,
      idUsuario: 10,
      nombreCajero: 'Carlos Gómez',
      montoInicial: 50000,
      montoFinal: 250000,
      totalVentas: 200000,
      fechaApertura: '2026-10-22T08:00:00Z',
      estado: 'ABIERTO'
    },
    {
      id: 2,
      idCaja: 2,
      idUsuario: 11,
      montoInicial: 40000,
      montoFinal: 150000,
      totalVentas: 110000,
      fechaApertura: '2026-10-22T09:00:00Z',
      estado: 'CERRADO'
    }
  ];

  beforeEach(async () => {
    cajaServiceSpy = {
      getHistorial: vi.fn().mockReturnValue(of(mockTurnosCaja))
    };

    await TestBed.configureTestingModule({
      imports: [TurnosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CajaService, useValue: cajaServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TurnosComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load shift history and map fields correctly on init', () => {
    fixture.detectChanges();

    expect(cajaServiceSpy.getHistorial).toHaveBeenCalledWith(component.fechaSeleccionada);
    expect(component.cargando()).toBe(false);
    expect(component.turnos().length).toBe(2);

    const first = component.turnos()[0];
    expect(first.id).toBe(1);
    expect(first.cajero).toBe('Carlos Gómez');
    expect(first.rol).toBe('Taquillero');
    expect(first.apertura).toBe('2026-10-22T08:00:00Z');
    expect(first.base).toBe(50000);
    expect(first.ventas).toBe(200000);
    expect(first.tiquetes).toBe(0);
    expect(first.activo).toBe(true);

    const second = component.turnos()[1];
    expect(second.id).toBe(2);
    expect(second.cajero).toBe('Cajero #11');
    expect(second.activo).toBe(false);
  });

  it('should reload turnos when fechaSeleccionada changes', () => {
    fixture.detectChanges();
    cajaServiceSpy.getHistorial.mockClear();
    cajaServiceSpy.getHistorial.mockReturnValue(of([]));

    component.fechaSeleccionada = '2026-10-25';
    component.cargarTurnos();

    expect(cajaServiceSpy.getHistorial).toHaveBeenCalledWith('2026-10-25');
    expect(component.turnos().length).toBe(0);
    expect(component.cargando()).toBe(false);
  });

  it('should handle service errors gracefully', () => {
    cajaServiceSpy.getHistorial.mockReturnValue(throwError(() => new Error('Error al cargar')));

    fixture.detectChanges();

    expect(component.turnos()).toEqual([]);
    expect(component.cargando()).toBe(false);
  });

  it('should export turnos to CSV with correct headers and mapped rows', () => {
    fixture.detectChanges();
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

    component.exportarCsv();

    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(clicked).toBe(true);
    expect(downloadedFilename).toBe(`historial_turnos_${component.fechaSeleccionada}.csv`);

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });

  it('should not export CSV if there are no turnos', () => {
    component.turnos.set([]);
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');

    component.exportarCsv();

    expect(createObjectUrlSpy).not.toHaveBeenCalled();
    createObjectUrlSpy.mockRestore();
  });

  it('should get initials from name correctly', () => {
    expect(component.getInitials('Carlos Gómez')).toBe('CG');
    expect(component.getInitials('María')).toBe('M');
  });
});
