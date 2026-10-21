import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArqueoCajaModalComponent } from './arqueo-caja-modal.component';
import { ResultadoArqueoDTO } from '../../../../core/models/caja.model';

describe('ArqueoCajaModalComponent', () => {
  let component: ArqueoCajaModalComponent;
  let fixture: ComponentFixture<ArqueoCajaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArqueoCajaModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ArqueoCajaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create with all 11 denominations and default zero count', () => {
    expect(component).toBeTruthy();
    expect(component.billetes.length).toBe(6);
    expect(component.monedas.length).toBe(5);
    expect(component.totalFisico()).toBe(0);
    expect(component.diferencia()).toBe(0);
    expect(component.estadoBalance()).toBe('CUADRADO');
    expect(component.puedeConfirmar()).toBe(true);
  });

  it('should calculate balance as FALTANTE when totalFisico < montoEsperado', () => {
    component.montoEsperado.set(150000);
    component.idTurno.set(8);
    fixture.detectChanges();

    expect(component.diferencia()).toBe(-150000);
    expect(component.estadoBalance()).toBe('FALTANTE');
    expect(component.requiereJustificacion()).toBe(true);
    expect(component.puedeConfirmar()).toBe(false);
  });

  it('should calculate balance as SOBRANTE when totalFisico > montoEsperado', () => {
    component.montoEsperado.set(50000);
    component.incrementar(100000);
    fixture.detectChanges();

    expect(component.totalFisico()).toBe(100000);
    expect(component.diferencia()).toBe(50000);
    expect(component.estadoBalance()).toBe('SOBRANTE');
    expect(component.requiereJustificacion()).toBe(true);
    expect(component.puedeConfirmar()).toBe(false);
  });

  it('should require at least 5 characters in justificacion when there is inconsistency', () => {
    component.montoEsperado.set(100000);
    fixture.detectChanges();

    expect(component.requiereJustificacion()).toBe(true);

    component.justificacion.set('abcd');
    expect(component.puedeConfirmar()).toBe(false);

    component.justificacion.set('Error en cambio entregado');
    expect(component.puedeConfirmar()).toBe(true);
  });

  it('should increment, decrement, and update quantities and subtotales', () => {
    component.incrementar(50000);
    component.incrementar(50000);
    expect(component.getCantidad(50000)).toBe(2);
    expect(component.getSubtotal(50000)).toBe(100000);
    expect(component.totalBilletes()).toBe(100000);

    component.decrementar(50000);
    expect(component.getCantidad(50000)).toBe(1);
    expect(component.getSubtotal(50000)).toBe(50000);

    // Cannot decrement below 0
    component.decrementar(50000);
    component.decrementar(50000);
    expect(component.getCantidad(50000)).toBe(0);
  });

  it('should handle manual input for coin quantity', () => {
    const mockEvent = {
      target: { value: '15' }
    } as unknown as Event;

    component.setCantidad(500, mockEvent);
    expect(component.getCantidad(500)).toBe(15);
    expect(component.getSubtotal(500)).toBe(7500);
    expect(component.totalMonedas()).toBe(7500);
  });

  it('should reset all counts and justification on limpiarConteo()', () => {
    component.incrementar(100000);
    component.incrementar(1000);
    component.justificacion.set('Nota temporal');

    expect(component.totalFisico()).toBe(101000);

    component.limpiarConteo();

    expect(component.totalFisico()).toBe(0);
    expect(component.justificacion()).toBe('');
  });

  it('should emit confirmarArqueo with full breakdown when confirmed', () => {
    component.montoEsperado.set(100000);
    component.idTurno.set(25);
    component.incrementar(100000);
    fixture.detectChanges();

    let emittedResult: ResultadoArqueoDTO | undefined;
    component.confirmarArqueo.subscribe(res => {
      emittedResult = res;
    });

    component.onConfirmar();

    expect(emittedResult).toBeTruthy();
    expect(emittedResult?.idTurno).toBe(25);
    expect(emittedResult?.montoEsperado).toBe(100000);
    expect(emittedResult?.totalFisico).toBe(100000);
    expect(emittedResult?.diferencia).toBe(0);
    expect(emittedResult?.estadoBalance).toBe('CUADRADO');
    expect(emittedResult?.desglose.length).toBe(11);
  });

  it('should emit cancelar on onCancelar()', () => {
    let canceled = false;
    component.cancelar.subscribe(() => {
      canceled = true;
    });

    component.onCancelar();
    expect(canceled).toBe(true);
  });
});
