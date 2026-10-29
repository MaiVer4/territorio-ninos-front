import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmarPagoModalComponent } from './confirmar-pago-modal.component';
import { ResumenLiquidacionPOS, SeleccionCatalogoPOS } from '../../../../core/models/atraccion.model';

describe('ConfirmarPagoModalComponent', () => {
  let component: ConfirmarPagoModalComponent;
  let fixture: ComponentFixture<ConfirmarPagoModalComponent>;

  const mockItem1: SeleccionCatalogoPOS = {
    atraccion: {
      id: 1,
      nombre: 'Inflable Gigante',
      tipo: 'TEMPORIZADA',
      tarifaMinuto: 600,
      capacidadMaxima: 10,
      ninosActivos: 8,
      duracionMinutosBase: 15
    },
    modalidad: {
      tipo: 'TEMPORIZADA',
      etiqueta: '15 min',
      valor: 15,
      precio: 9000
    },
    cantidad: 1,
    menorAsignado: { idMenor: 1, nombreCompleto: 'Lucas Gómez', edad: 5 }
  };

  const mockItem2: SeleccionCatalogoPOS = {
    atraccion: {
      id: 2,
      nombre: 'Toro Mecánico',
      tipo: 'EVENTOS_CAIDAS',
      tarifaMinuto: 10000,
      capacidadMaxima: 5,
      ninosActivos: 1,
      duracionMinutosBase: 0,
      caidasLimite: 3
    },
    modalidad: {
      tipo: 'EVENTOS_CAIDAS',
      etiqueta: '3 caídas',
      valor: 3,
      precio: 10000
    },
    cantidad: 2,
    menorAsignado: { idMenor: 2, nombreCompleto: 'Sofía Gómez', edad: 8 }
  };

  const mockResumenEfectivo: ResumenLiquidacionPOS = {
    items: [mockItem1, mockItem2],
    totalBoletas: 3,
    subtotal: 24370,
    porcentajeIva: 19,
    impuestos: 4630,
    granTotal: 29000,
    metodoPago: 'EFECTIVO',
    montoRecibido: 50000,
    cambio: 21000,
    fecha: new Date('2026-10-29T10:00:00Z')
  };

  const mockResumenTarjeta: ResumenLiquidacionPOS = {
    items: [mockItem1],
    totalBoletas: 1,
    subtotal: 7563,
    porcentajeIva: 19,
    impuestos: 1437,
    granTotal: 9000,
    metodoPago: 'TARJETA_DEBITO',
    montoRecibido: 9000,
    cambio: 0,
    fecha: new Date('2026-10-29T10:30:00Z')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmarPagoModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmarPagoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render basic dialog elements', () => {
    expect(component).toBeTruthy();
    const modalEl = fixture.debugElement.query(By.css('[data-testid="modal-confirmar-pago"]'));
    expect(modalEl).toBeTruthy();
  });

  it('should render customer name or fallback when not provided', () => {
    // Fallback default
    expect(component.clienteNombre).toBe('Cliente de Mostrador');
    let clienteEl = fixture.debugElement.query(By.css('[data-testid="cliente-titular-pago"]'));
    expect(clienteEl.nativeElement.textContent.trim()).toBe('Cliente de Mostrador');

    // Provided name
    component.clienteNombre = 'María Pérez';
    fixture.detectChanges();
    clienteEl = fixture.debugElement.query(By.css('[data-testid="cliente-titular-pago"]'));
    expect(clienteEl.nativeElement.textContent.trim()).toBe('María Pérez');
  });

  it('should render sale summary with items, amounts, IVA, and prominent total to charge', () => {
    component.resumen = mockResumenEfectivo;
    fixture.detectChanges();

    // Check items rendered
    const itemsContainer = fixture.debugElement.query(By.css('[data-testid="resumen-items-pago"]'));
    expect(itemsContainer).toBeTruthy();
    expect(itemsContainer.nativeElement.textContent).toContain('Inflable Gigante');
    expect(itemsContainer.nativeElement.textContent).toContain('Toro Mecánico');
    expect(itemsContainer.nativeElement.textContent).toContain('Lucas Gómez');
    expect(itemsContainer.nativeElement.textContent).toContain('Sofía Gómez');

    // Check prominent total to charge ($29.000 COP)
    const totalCobrarEl = fixture.debugElement.query(By.css('[data-testid="monto-total-cobrar"]'));
    expect(totalCobrarEl).toBeTruthy();
    expect(totalCobrarEl.nativeElement.textContent).toContain('$29.000');
    expect(totalCobrarEl.nativeElement.textContent).toContain('COP');
  });

  it('should display cash details (received cash and change) when payment method is EFECTIVO', () => {
    component.resumen = mockResumenEfectivo;
    fixture.detectChanges();

    const metodoEl = fixture.debugElement.query(By.css('[data-testid="metodo-pago-seleccionado"]'));
    expect(metodoEl.nativeElement.textContent).toContain('Efectivo');

    const efectivoContainer = fixture.debugElement.query(By.css('[data-testid="detalle-efectivo-modal"]'));
    expect(efectivoContainer).toBeTruthy();

    const montoRecibidoEl = fixture.debugElement.query(By.css('[data-testid="monto-recibido-modal"]'));
    const cambioEl = fixture.debugElement.query(By.css('[data-testid="cambio-modal"]'));
    expect(montoRecibidoEl.nativeElement.textContent).toContain('$50.000');
    expect(cambioEl.nativeElement.textContent).toContain('$21.000');
  });

  it('should hide cash details when payment method is not EFECTIVO', () => {
    component.resumen = mockResumenTarjeta;
    fixture.detectChanges();

    const metodoEl = fixture.debugElement.query(By.css('[data-testid="metodo-pago-seleccionado"]'));
    expect(metodoEl.nativeElement.textContent).toContain('Tarjeta Débito');

    const efectivoContainer = fixture.debugElement.query(By.css('[data-testid="detalle-efectivo-modal"]'));
    expect(efectivoContainer).toBeNull();
  });

  it('should implement strict double-click guard preventing duplicate payment processing', () => {
    component.resumen = mockResumenEfectivo;
    fixture.detectChanges();

    let emissionCount = 0;
    component.confirmarPago.subscribe(() => {
      emissionCount++;
    });

    const btnProcesar = fixture.debugElement.query(By.css('[data-testid="btn-procesar-pago"]'));
    expect(btnProcesar.nativeElement.disabled).toBe(false);

    // First click: triggers processing
    btnProcesar.nativeElement.click();
    fixture.detectChanges();

    expect(emissionCount).toBe(1);
    expect(component.procesando()).toBe(true);
    expect(btnProcesar.nativeElement.disabled).toBe(true);

    // Second click: guard must ignore it
    btnProcesar.nativeElement.click();
    fixture.detectChanges();

    // Third call directly to handler: must also ignore
    component.onProcesarPago();

    expect(emissionCount).toBe(1);
  });

  it('should display progress bar and spinner when transaction is being processed', () => {
    component.resumen = mockResumenEfectivo;
    fixture.detectChanges();

    // Before processing
    expect(fixture.debugElement.query(By.css('[data-testid="barra-progreso-pago"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="spinner-pago"]'))).toBeNull();

    // Trigger processing
    component.onProcesarPago();
    fixture.detectChanges();

    // After processing initiated
    expect(component.estaProcesando()).toBe(true);
    const barraProgreso = fixture.debugElement.query(By.css('[data-testid="barra-progreso-pago"]'));
    const spinner = fixture.debugElement.query(By.css('[data-testid="spinner-pago"]'));
    expect(barraProgreso).toBeTruthy();
    expect(spinner).toBeTruthy();

    // Cancel and close buttons should be disabled
    const btnCancelar = fixture.debugElement.query(By.css('[data-testid="btn-cancelar-pago"]'));
    const btnCerrar = fixture.debugElement.query(By.css('[data-testid="btn-cerrar-modal"]'));
    expect(btnCancelar.nativeElement.disabled).toBe(true);
    expect(btnCerrar.nativeElement.disabled).toBe(true);
  });

  it('should emit cancelar event when clicking Volver / Cancelar and not processing', () => {
    let cancelEmitted = false;
    component.cancelar.subscribe(() => {
      cancelEmitted = true;
    });

    const btnCancelar = fixture.debugElement.query(By.css('[data-testid="btn-cancelar-pago"]'));
    btnCancelar.nativeElement.click();

    expect(cancelEmitted).toBe(true);
  });

  it('should not emit cancelar event if processing is active', () => {
    component.resumen = mockResumenEfectivo;
    component.procesandoExterno = true;
    fixture.detectChanges();

    let cancelEmitted = false;
    component.cancelar.subscribe(() => {
      cancelEmitted = true;
    });

    component.onCancelar();
    expect(cancelEmitted).toBe(false);
  });
});
