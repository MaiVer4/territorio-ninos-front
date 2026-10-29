import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PosCartComponent } from './pos-cart.component';
import { ResumenLiquidacionPOS, SeleccionCatalogoPOS } from '../../../../core/models/atraccion.model';
import { Menor } from '../../../../core/models/cliente.model';

describe('PosCartComponent', () => {
  let component: PosCartComponent;
  let fixture: ComponentFixture<PosCartComponent>;

  const mockMenores: Menor[] = [
    { idMenor: 1, nombreCompleto: 'Lucas Gómez', edad: 5 },
    { idMenor: 2, nombreCompleto: 'Sofía Gómez', edad: 8 }
  ];

  const mockItem1: SeleccionCatalogoPOS = {
    atraccion: {
      id: 1,
      nombre: 'Inflable Gigante',
      tipo: 'TEMPORIZADA',
      tarifaMinuto: 600,
      capacidadMaxima: 10,
      ninosActivos: 8, // cupos = 2
      duracionMinutosBase: 15
    },
    modalidad: {
      tipo: 'TEMPORIZADA',
      etiqueta: '15 min',
      valor: 15,
      precio: 9000
    },
    cantidad: 1,
    menorAsignado: null
  };

  const mockItem2: SeleccionCatalogoPOS = {
    atraccion: {
      id: 2,
      nombre: 'Toro Mecánico',
      tipo: 'EVENTOS_CAIDAS',
      tarifaMinuto: 10000,
      capacidadMaxima: 5,
      ninosActivos: 1, // cupos = 4
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
    menorAsignado: mockMenores[0]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosCartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PosCartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and display empty state when items is empty', () => {
    expect(component).toBeTruthy();
    const emptyMsg = fixture.debugElement.query(By.css('[data-testid="orden-vacia"]'));
    expect(emptyMsg).toBeTruthy();
    expect(emptyMsg.nativeElement.textContent).toContain('No hay boletas en la orden');
  });

  it('should render items, quantities, and line subtotals correctly', () => {
    component.items = [mockItem1, mockItem2];
    component.menores = mockMenores;
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('[data-testid^="item-orden-"]'));
    expect(items.length).toBe(2);

    // Item 1: 1 * 9.000 = 9.000
    const qty1 = fixture.debugElement.query(By.css('[data-testid="cantidad-item-0"]'));
    const subtotal1 = fixture.debugElement.query(By.css('[data-testid="subtotal-item-0"]'));
    expect(qty1.nativeElement.textContent.trim()).toBe('1');
    expect(subtotal1.nativeElement.textContent).toContain('$9.000');

    // Item 2: 2 * 10.000 = 20.000
    const qty2 = fixture.debugElement.query(By.css('[data-testid="cantidad-item-1"]'));
    const subtotal2 = fixture.debugElement.query(By.css('[data-testid="subtotal-item-1"]'));
    expect(qty2.nativeElement.textContent.trim()).toBe('2');
    expect(subtotal2.nativeElement.textContent).toContain('$20.000');

    // Total general: 9.000 + 20.000 = 29.000 COP, 3 boletas
    const totalEl = fixture.debugElement.query(By.css('[data-testid="total-orden"]'));
    expect(totalEl.nativeElement.textContent).toContain('$29.000');
    expect(component.totalBoletas()).toBe(3);
  });

  it('should increment quantity when clicking + and emit itemsChange', () => {
    component.items = [mockItem1];
    component.menores = mockMenores;
    fixture.detectChanges();

    let emittedItems: SeleccionCatalogoPOS[] = [];
    component.itemsChange.subscribe(items => emittedItems = items);

    const btnInc = fixture.debugElement.query(By.css('[data-testid="btn-incrementar-0"]'));
    btnInc.nativeElement.click();
    fixture.detectChanges();

    expect(emittedItems.length).toBe(1);
    expect(emittedItems[0].cantidad).toBe(2);
    expect(component.granTotal()).toBe(18000);
    expect(component.subtotal()).toBe(15126);
  });

  it('should disable + button when reaching available attraction capacity', () => {
    // mockItem1 has capacidadMaxima=10, ninosActivos=8 => 2 available spots
    component.items = [{ ...mockItem1, cantidad: 2 }];
    fixture.detectChanges();

    const btnInc = fixture.debugElement.query(By.css('[data-testid="btn-incrementar-0"]'));
    expect(btnInc.nativeElement.disabled).toBe(true);
  });

  it('should decrement quantity when clicking - and emit itemsChange', () => {
    component.items = [mockItem2]; // cantidad: 2
    fixture.detectChanges();

    let emittedItems: SeleccionCatalogoPOS[] = [];
    component.itemsChange.subscribe(items => emittedItems = items);

    const btnDec = fixture.debugElement.query(By.css('[data-testid="btn-decrementar-0"]'));
    btnDec.nativeElement.click();
    fixture.detectChanges();

    expect(emittedItems.length).toBe(1);
    expect(emittedItems[0].cantidad).toBe(1);
  });

  it('should remove item when decrementing an item that has quantity 1', () => {
    component.items = [mockItem1]; // cantidad: 1
    fixture.detectChanges();

    let emittedItems: SeleccionCatalogoPOS[] = [];
    component.itemsChange.subscribe(items => emittedItems = items);

    const btnDec = fixture.debugElement.query(By.css('[data-testid="btn-decrementar-0"]'));
    btnDec.nativeElement.click();
    fixture.detectChanges();

    expect(emittedItems.length).toBe(0);
    expect(component.items.length).toBe(0);
  });

  it('should remove item when clicking delete button (✕)', () => {
    component.items = [mockItem1, mockItem2];
    fixture.detectChanges();

    let emittedItems: SeleccionCatalogoPOS[] = [];
    component.itemsChange.subscribe(items => emittedItems = items);

    const btnQuitar = fixture.debugElement.query(By.css('[data-testid="btn-quitar-item-0"]'));
    btnQuitar.nativeElement.click();
    fixture.detectChanges();

    expect(emittedItems.length).toBe(1);
    expect(emittedItems[0].atraccion.id).toBe(2);
  });

  it('should clear all items when clicking Vaciar', () => {
    component.items = [mockItem1, mockItem2];
    fixture.detectChanges();

    let emittedItems: SeleccionCatalogoPOS[] = [];
    component.itemsChange.subscribe(items => emittedItems = items);

    const btnVaciar = fixture.debugElement.query(By.css('[data-testid="btn-limpiar-orden"]'));
    btnVaciar.nativeElement.click();
    fixture.detectChanges();

    expect(emittedItems.length).toBe(0);
    expect(component.totalBoletas()).toBe(0);
  });

  it('should populate minor dropdown with available minors and assign selected minor', () => {
    component.items = [mockItem1]; // menorAsignado: null
    component.menores = mockMenores;
    fixture.detectChanges();

    let emittedItems: SeleccionCatalogoPOS[] = [];
    component.itemsChange.subscribe(items => emittedItems = items);

    const select = fixture.debugElement.query(By.css('[data-testid="select-menor-0"]'));
    expect(select).toBeTruthy();

    const options = select.queryAll(By.css('option'));
    // 1 default ("-- Sin menor asignado --") + 2 minors
    expect(options.length).toBe(3);

    // Select Lucas Gómez (idMenor: 1)
    select.nativeElement.value = '1';
    select.nativeElement.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(emittedItems.length).toBe(1);
    expect(emittedItems[0].menorAsignado?.nombreCompleto).toBe('Lucas Gómez');
  });

  it('should unassign minor when selecting empty option', () => {
    component.items = [mockItem2]; // menorAsignado: Lucas Gómez
    component.menores = mockMenores;
    fixture.detectChanges();

    let emittedItems: SeleccionCatalogoPOS[] = [];
    component.itemsChange.subscribe(items => emittedItems = items);

    const select = fixture.debugElement.query(By.css('[data-testid="select-menor-0"]'));
    select.nativeElement.value = '';
    select.nativeElement.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(emittedItems.length).toBe(1);
    expect(emittedItems[0].menorAsignado).toBeNull();
  });

  describe('Panel de Liquidación, Métodos de Pago y Cambio (CA-01, CA-02, CA-03)', () => {
    beforeEach(() => {
      component.items = [mockItem1, mockItem2]; // total: 9000 + 20000 = 29000
      component.menores = mockMenores;
      fixture.detectChanges();
    });

    it('should calculate and display subtotal base, IVA 19%, and gran total correctly', () => {
      // granTotal = 29.000
      // subtotal = Math.round(29000 / 1.19) = 24.370
      // impuestos = 29000 - 24370 = 4.630
      expect(component.granTotal()).toBe(29000);
      expect(component.subtotal()).toBe(24370);
      expect(component.impuestos()).toBe(4630);

      const subtotalEl = fixture.debugElement.query(By.css('[data-testid="subtotal-orden"]'));
      const impuestosEl = fixture.debugElement.query(By.css('[data-testid="impuestos-orden"]'));
      const granTotalEl = fixture.debugElement.query(By.css('[data-testid="gran-total-orden"]'));

      expect(subtotalEl.nativeElement.textContent).toContain('$24.370');
      expect(impuestosEl.nativeElement.textContent).toContain('$4.630');
      expect(granTotalEl.nativeElement.textContent).toContain('$29.000');
    });

    it('should allow switching payment methods and adjust validation state', () => {
      expect(component.metodoPago()).toBe('EFECTIVO');
      // For EFECTIVO with montoRecibido = 0 and granTotal > 0, pagoValido is false
      expect(component.pagoValido()).toBe(false);

      // Switch to TARJETA_DEBITO
      const btnDebito = fixture.debugElement.query(By.css('[data-testid="btn-metodo-tarjeta-debito"]'));
      btnDebito.nativeElement.click();
      fixture.detectChanges();

      expect(component.metodoPago()).toBe('TARJETA_DEBITO');
      expect(component.pagoValido()).toBe(true);

      // Input for cash should not be present
      const inputEfectivo = fixture.debugElement.query(By.css('[data-testid="input-monto-recibido"]'));
      expect(inputEfectivo).toBeNull();

      // Switch to TARJETA_CREDITO
      const btnCredito = fixture.debugElement.query(By.css('[data-testid="btn-metodo-tarjeta-credito"]'));
      btnCredito.nativeElement.click();
      fixture.detectChanges();
      expect(component.metodoPago()).toBe('TARJETA_CREDITO');
      expect(component.pagoValido()).toBe(true);

      // Switch to TRANSFERENCIA
      const btnTransf = fixture.debugElement.query(By.css('[data-testid="btn-metodo-transferencia"]'));
      btnTransf.nativeElement.click();
      fixture.detectChanges();
      expect(component.metodoPago()).toBe('TRANSFERENCIA');
      expect(component.pagoValido()).toBe(true);

      // Switch back to EFECTIVO
      const btnEfectivo = fixture.debugElement.query(By.css('[data-testid="btn-metodo-efectivo"]'));
      btnEfectivo.nativeElement.click();
      fixture.detectChanges();
      expect(component.metodoPago()).toBe('EFECTIVO');
      expect(component.pagoValido()).toBe(false);
    });

    it('should calculate cash change (vuelto) when received cash exceeds total', () => {
      // Cash input of 50.000 COP for 29.000 COP order
      const input = fixture.debugElement.query(By.css('[data-testid="input-monto-recibido"]'));
      input.nativeElement.value = '50000';
      input.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.montoRecibido()).toBe(50000);
      expect(component.cambio()).toBe(21000);
      expect(component.faltanteEfectivo()).toBe(0);
      expect(component.pagoValido()).toBe(true);

      const cambioEl = fixture.debugElement.query(By.css('[data-testid="valor-cambio"]'));
      expect(cambioEl).toBeTruthy();
      expect(cambioEl.nativeElement.textContent).toContain('$21.000');
    });

    it('should show faltante alert and disable confirm button when cash is insufficient', () => {
      // Cash input of 20.000 COP for 29.000 COP order -> faltante = 9.000 COP
      const input = fixture.debugElement.query(By.css('[data-testid="input-monto-recibido"]'));
      input.nativeElement.value = '20000';
      input.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.montoRecibido()).toBe(20000);
      expect(component.cambio()).toBe(0);
      expect(component.faltanteEfectivo()).toBe(9000);
      expect(component.pagoValido()).toBe(false);

      const faltanteEl = fixture.debugElement.query(By.css('[data-testid="valor-faltante"]'));
      expect(faltanteEl).toBeTruthy();
      expect(faltanteEl.nativeElement.textContent).toContain('$9.000');

      const btnLiquidar = fixture.debugElement.query(By.css('[data-testid="btn-liquidar-orden"]'));
      expect(btnLiquidar.nativeElement.disabled).toBe(true);
    });

    it('should select exact cash amount with shortcut button', () => {
      const btnExacto = fixture.debugElement.query(By.css('[data-testid="btn-atajo-exacto"]'));
      btnExacto.nativeElement.click();
      fixture.detectChanges();

      expect(component.montoRecibido()).toBe(29000);
      expect(component.cambio()).toBe(0);
      expect(component.pagoValido()).toBe(true);
    });

    it('should select denomination shortcut button ($50.000)', () => {
      const btn50k = fixture.debugElement.query(By.css('[data-testid="btn-atajo-50000"]'));
      btn50k.nativeElement.click();
      fixture.detectChanges();

      expect(component.montoRecibido()).toBe(50000);
      expect(component.cambio()).toBe(21000);
      expect(component.pagoValido()).toBe(true);
    });

    it('should emit liquidarOrden with full summary when clicking Cobrar y Liquidar Orden', () => {
      let liquidacionResult: ResumenLiquidacionPOS | null = null;
      component.liquidarOrden.subscribe(res => liquidacionResult = res);

      // Select exact cash amount
      component.seleccionarEfectivoExacto();
      fixture.detectChanges();

      const btnLiquidar = fixture.debugElement.query(By.css('[data-testid="btn-liquidar-orden"]'));
      expect(btnLiquidar.nativeElement.disabled).toBe(false);
      btnLiquidar.nativeElement.click();
      fixture.detectChanges();

      expect(liquidacionResult).toBeTruthy();
      expect(liquidacionResult!.granTotal).toBe(29000);
      expect(liquidacionResult!.subtotal).toBe(24370);
      expect(liquidacionResult!.impuestos).toBe(4630);
      expect(liquidacionResult!.totalBoletas).toBe(3);
      expect(liquidacionResult!.metodoPago).toBe('EFECTIVO');
      expect(liquidacionResult!.montoRecibido).toBe(29000);
      expect(liquidacionResult!.cambio).toBe(0);
      expect(liquidacionResult!.items.length).toBe(2);
      expect(liquidacionResult!.fecha).toBeTruthy();
    });

    it('should prevent incrementing when total across multiple lines reaches capacity', () => {
      // mockItem1 has cap=10, ninosActivos=8 => 2 spots available.
      // 2 separate lines of 1 ticket each = 2 tickets total.
      const line1: SeleccionCatalogoPOS = { ...mockItem1, cantidad: 1 };
      const line2: SeleccionCatalogoPOS = { ...mockItem1, cantidad: 1, modalidad: { ...mockItem1.modalidad, etiqueta: '30 min' } };
      component.items = [line1, line2];
      fixture.detectChanges();

      expect(component.estaEnCapacidadMaxima(line1)).toBe(true);
      const btnInc0 = fixture.debugElement.query(By.css('[data-testid="btn-incrementar-0"]'));
      expect(btnInc0.nativeElement.disabled).toBe(true);
    });
  });
});
