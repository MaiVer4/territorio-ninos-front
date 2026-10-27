import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CatalogoAtraccionesComponent } from './catalogo-atracciones.component';
import { Atraccion, SeleccionCatalogoPOS } from '../../../../core/models/atraccion.model';

describe('CatalogoAtraccionesComponent', () => {
  let component: CatalogoAtraccionesComponent;
  let fixture: ComponentFixture<CatalogoAtraccionesComponent>;

  const mockAtraccionTiempo: Atraccion = {
    id: 1,
    nombre: 'Inflable Gigante',
    descripcion: 'Pista de obstáculos inflable',
    tarifaMinuto: 600,
    precio: 9000,
    tipo: 'TEMPORIZADA',
    estado: 'ACTIVO',
    capacidadMaxima: 15,
    ninosActivos: 5,
    duracionMinutosBase: 15
  };

  const mockAtraccionCaidas: Atraccion = {
    id: 2,
    nombre: 'Toro Mecánico',
    descripcion: 'Simulador mecánico con caídas controladas',
    tarifaMinuto: 10000,
    precio: 10000,
    tipo: 'EVENTOS_CAIDAS',
    estado: 'ACTIVO',
    capacidadMaxima: 5,
    ninosActivos: 2,
    duracionMinutosBase: 0,
    caidasLimite: 3
  };

  const mockAtraccionLleno: Atraccion = {
    id: 3,
    nombre: 'Cama Elástica',
    tarifaMinuto: 500,
    tipo: 'TEMPORIZADA',
    estado: 'ACTIVO',
    capacidadMaxima: 8,
    ninosActivos: 8,
    duracionMinutosBase: 15
  };

  const mockAtraccionInactiva: Atraccion = {
    id: 4,
    nombre: 'Piscina de Pelotas',
    tarifaMinuto: 400,
    tipo: 'TEMPORIZADA',
    estado: 'INACTIVO',
    capacidadMaxima: 20,
    ninosActivos: 0,
    duracionMinutosBase: 20
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogoAtraccionesComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogoAtraccionesComponent);
    component = fixture.componentInstance;
    component.atracciones = [
      mockAtraccionTiempo,
      mockAtraccionCaidas,
      mockAtraccionLleno,
      mockAtraccionInactiva
    ];
    fixture.detectChanges();
  });

  it('should create and render attraction cards', () => {
    expect(component).toBeTruthy();
    const cards = fixture.debugElement.queryAll(By.css('[data-testid^="card-atraccion-"]'));
    expect(cards.length).toBe(4);
  });

  it('should display available spots correctly (capacidadMaxima - ninosActivos)', () => {
    const cardTiempo = fixture.debugElement.query(By.css('[data-testid="card-atraccion-1"]'));
    const badgeCupos = cardTiempo.query(By.css('[data-testid="badge-cupos"]'));
    expect(badgeCupos).toBeTruthy();
    expect(badgeCupos.nativeElement.textContent).toContain('10 cupos'); // 15 - 5
  });

  it('should display base price in COP format', () => {
    const cardTiempo = fixture.debugElement.query(By.css('[data-testid="card-atraccion-1"]'));
    expect(cardTiempo.nativeElement.textContent).toContain('$9.000');
  });

  it('should render 15, 30 and 60 minutes modality buttons for TEMPORIZADA attractions', () => {
    const btn15 = fixture.debugElement.query(By.css('[data-testid="btn-modalidad-1-15"]'));
    const btn30 = fixture.debugElement.query(By.css('[data-testid="btn-modalidad-1-30"]'));
    const btn60 = fixture.debugElement.query(By.css('[data-testid="btn-modalidad-1-60"]'));

    expect(btn15).toBeTruthy();
    expect(btn30).toBeTruthy();
    expect(btn60).toBeTruthy();
    expect(btn15.nativeElement.textContent).toContain('15 min');
    expect(btn30.nativeElement.textContent).toContain('30 min');
    expect(btn60.nativeElement.textContent).toContain('60 min');
  });

  it('should update active selection price when choosing different duration modality', () => {
    const btn30 = fixture.debugElement.query(By.css('[data-testid="btn-modalidad-1-30"]'));
    btn30.nativeElement.click();
    fixture.detectChanges();

    const precioEl = fixture.debugElement.query(By.css('[data-testid="precio-seleccion-1"]'));
    // 600 * 30 = 18.000
    expect(precioEl.nativeElement.textContent).toContain('$18.000');
  });

  it('should render caídas modalities for EVENTOS_CAIDAS attractions', () => {
    const cardCaidas = fixture.debugElement.query(By.css('[data-testid="card-atraccion-2"]'));
    expect(cardCaidas.nativeElement.textContent).toContain('3 caídas');
    expect(cardCaidas.nativeElement.textContent).toContain('5 caídas');
  });

  it('should visually and functionally block attraction when aforo is full (cupos == 0)', () => {
    const cardLleno = fixture.debugElement.query(By.css('[data-testid="card-atraccion-3"]'));
    expect(cardLleno.nativeElement.classList).toContain('opacity-60');

    const badgeAforo = cardLleno.query(By.css('[data-testid="badge-aforo-completo"]'));
    expect(badgeAforo).toBeTruthy();
    expect(badgeAforo.nativeElement.textContent).toContain('Aforo Completo');

    const btnAgregar = cardLleno.query(By.css('[data-testid="btn-agregar-3"]'));
    expect(btnAgregar.nativeElement.disabled).toBe(true);
    expect(btnAgregar.nativeElement.textContent).toContain('Sin Cupo');
  });

  it('should visually and functionally block attraction when estado is not ACTIVO', () => {
    const cardInactivo = fixture.debugElement.query(By.css('[data-testid="card-atraccion-4"]'));
    expect(cardInactivo.nativeElement.classList).toContain('opacity-60');

    const badgeInactivo = cardInactivo.query(By.css('[data-testid="badge-inactivo"]'));
    expect(badgeInactivo).toBeTruthy();
    expect(badgeInactivo.nativeElement.textContent).toContain('Inactiva');

    const btnAgregar = cardInactivo.query(By.css('[data-testid="btn-agregar-4"]'));
    expect(btnAgregar.nativeElement.disabled).toBe(true);
    expect(btnAgregar.nativeElement.textContent).toContain('No Disp.');
  });

  it('should emit atraccionSeleccionada with chosen modality when clicking Añadir', () => {
    let emittedSelection: SeleccionCatalogoPOS | undefined;
    component.atraccionSeleccionada.subscribe(sel => emittedSelection = sel);

    // Select 30 min modality on attraction 1
    const btn30 = fixture.debugElement.query(By.css('[data-testid="btn-modalidad-1-30"]'));
    btn30.nativeElement.click();
    fixture.detectChanges();

    const btnAgregar = fixture.debugElement.query(By.css('[data-testid="btn-agregar-1"]'));
    btnAgregar.nativeElement.click();

    expect(emittedSelection).toBeDefined();
    expect(emittedSelection?.atraccion.id).toBe(1);
    expect(emittedSelection?.modalidad.valor).toBe(30);
    expect(emittedSelection?.modalidad.precio).toBe(18000);
  });

  it('should filter attractions by search input query', () => {
    component.busqueda.set('toro');
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('[data-testid^="card-atraccion-"]'));
    expect(cards.length).toBe(1);
    expect(cards[0].nativeElement.textContent).toContain('Toro Mecánico');
  });

  it('should filter attractions by category tabs', () => {
    component.filtroTipo.set('EVENTOS_CAIDAS');
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('[data-testid^="card-atraccion-"]'));
    expect(cards.length).toBe(1);
    expect(cards[0].nativeElement.textContent).toContain('Toro Mecánico');

    component.filtroTipo.set('TEMPORIZADA');
    fixture.detectChanges();

    const cardsTiempo = fixture.debugElement.queryAll(By.css('[data-testid^="card-atraccion-"]'));
    expect(cardsTiempo.length).toBe(3);
  });

  it('should display loading skeleton when cargando is true', () => {
    component.cargando = true;
    fixture.detectChanges();

    const skeleton = fixture.debugElement.query(By.css('[data-testid="loading-skeleton"]'));
    expect(skeleton).toBeTruthy();
  });

  it('should display empty message when search yields no matches', () => {
    component.busqueda.set('Inexistente12345');
    fixture.detectChanges();

    const empty = fixture.debugElement.query(By.css('[data-testid="empty-catalog"]'));
    expect(empty).toBeTruthy();
    expect(empty.nativeElement.textContent).toContain('No se encontraron atracciones');
  });
});
