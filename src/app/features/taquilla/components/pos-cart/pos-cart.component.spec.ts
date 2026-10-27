import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PosCartComponent } from './pos-cart.component';
import { SeleccionCatalogoPOS } from '../../../../core/models/atraccion.model';
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
    expect(component.subtotal()).toBe(18000);
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
});
