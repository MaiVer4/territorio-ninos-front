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
    ocupacionActual: 5,
    aforoDisponible: 10,
    tieneCupo: true,
    tieneOperarioAsignado: true,
    duracionMinutosBase: 15,
    tarifasTiempo: [
      { id: 101, duracionMinutos: 15, precio: 9000, activo: true },
      { id: 102, duracionMinutos: 30, precio: 18000, activo: true },
      { id: 103, duracionMinutos: 60, precio: 33000, activo: true }
    ],
    tarifasEvento: []
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
    ocupacionActual: 2,
    aforoDisponible: 3,
    tieneCupo: true,
    tieneOperarioAsignado: false,
    duracionMinutosBase: 0,
    caidasLimite: 3,
    tarifasTiempo: [],
    tarifasEvento: [
      { id: 201, intentos: 3, precio: 10000, activo: true },
      { id: 202, intentos: 5, precio: 15000, activo: true }
    ]
  };

  const mockAtraccionLleno: Atraccion = {
    id: 3,
    nombre: 'Cama Elástica',
    tarifaMinuto: 500,
    tipo: 'TEMPORIZADA',
    estado: 'ACTIVO',
    capacidadMaxima: 8,
    ocupacionActual: 8,
    aforoDisponible: 0,
    tieneCupo: false,
    tieneOperarioAsignado: true,
    duracionMinutosBase: 15,
    tarifasTiempo: [
      { id: 301, duracionMinutos: 15, precio: 5000, activo: true }
    ],
    tarifasEvento: []
  };

  const mockAtraccionInactiva: Atraccion = {
    id: 4,
    nombre: 'Piscina de Pelotas',
    tarifaMinuto: 400,
    tipo: 'TEMPORIZADA',
    estado: 'INACTIVO',
    capacidadMaxima: 20,
    ocupacionActual: 0,
    aforoDisponible: 20,
    tieneCupo: true,
    duracionMinutosBase: 20,
    tarifasTiempo: [
      { id: 401, duracionMinutos: 20, precio: 8000, activo: true }
    ],
    tarifasEvento: []
  };

  const mockAtraccionSinTarifa: Atraccion = {
    id: 5,
    nombre: 'Muro de Escalar',
    tarifaMinuto: 1000,
    tipo: 'TEMPORIZADA',
    estado: 'ACTIVO',
    capacidadMaxima: 10,
    ocupacionActual: 0,
    aforoDisponible: 10,
    tieneCupo: true,
    duracionMinutosBase: 15,
    tarifasTiempo: [],
    tarifasEvento: []
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

  it('should show full badge but still allow selling when aforo is full (cupos == 0)', () => {
    const cardLleno = fixture.debugElement.query(By.css('[data-testid="card-atraccion-3"]'));
    expect(cardLleno.nativeElement.classList).not.toContain('opacity-60');

    const badgeAforo = cardLleno.query(By.css('[data-testid="badge-aforo-completo"]'));
    expect(badgeAforo).toBeTruthy();
    expect(badgeAforo.nativeElement.textContent).toContain('Lleno');

    const btnAgregar = cardLleno.query(By.css('[data-testid="btn-agregar-3"]'));
    expect(btnAgregar.nativeElement.disabled).toBe(false);
    expect(btnAgregar.nativeElement.textContent).toContain('Añadir');
  });

  it('should format entry time text from backend fields', () => {
    const base = { id: 9, nombre: 'X', tipo: 'TEMPORIZADA', capacidadMaxima: 5 } as any;
    expect(component.textoIngreso({ ...base, aforoDisponible: 3, tieneCupo: true, ingresoTexto: 'AHORA' })).toBe('Ingreso: AHORA');
    expect(component.textoIngreso({ ...base, aforoDisponible: 0, tieneCupo: false, horaProximoIngreso: '2026-11-19T15:40:00', ingresoTexto: '15:40 (aprox.)' })).toBe('Lleno · ingreso ~15:40');
    expect(component.textoIngreso({ ...base, aforoDisponible: 0, tieneCupo: false, horaProximoIngreso: '2026-11-19T16:05:00' })).toBe('Lleno · ingreso ~16:05');
    expect(component.textoIngreso({ ...base, tipo: 'EVENTOS_CAIDAS', aforoDisponible: 0, tieneCupo: false, ingresoTexto: 'PRÓXIMO TURNO' })).toBe('Lleno · próximo turno');
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

  it('should display badge-sin-operario when tieneOperarioAsignado is false', () => {
    const cardCaidas = fixture.debugElement.query(By.css('[data-testid="card-atraccion-2"]'));
    const badgeSinOperario = cardCaidas.query(By.css('[data-testid="badge-sin-operario"]'));
    expect(badgeSinOperario).toBeTruthy();
    expect(badgeSinOperario.nativeElement.textContent).toContain('Sin operario');
  });

  it('should block attraction and display message when no rates are configured', () => {
    component.atracciones = [mockAtraccionSinTarifa];
    fixture.detectChanges();

    const card = fixture.debugElement.query(By.css('[data-testid="card-atraccion-5"]'));
    expect(card).toBeTruthy();
    expect(card.nativeElement.classList).toContain('opacity-60');

    const msg = card.query(By.css('[data-testid="msg-sin-tarifa"]'));
    expect(msg).toBeTruthy();
    expect(msg.nativeElement.textContent).toContain('Sin tarifa configurada');

    const btnAgregar = card.query(By.css('[data-testid="btn-agregar-5"]'));
    expect(btnAgregar.nativeElement.disabled).toBe(true);
    expect(btnAgregar.nativeElement.textContent).toContain('Sin Tarifa');
  });

  it('should ignore inactive rates when activo is false', () => {
    const atraccionConInactivas: Atraccion = {
      id: 6,
      nombre: 'Brincolín con tarifas inactivas',
      tipo: 'TEMPORIZADA',
      estado: 'ACTIVO',
      capacidadMaxima: 10,
      ocupacionActual: 0,
      aforoDisponible: 10,
      tieneCupo: true,
      duracionMinutosBase: 15,
      tarifaMinuto: 500,
      tarifasTiempo: [
        { id: 601, duracionMinutos: 15, precio: 5000, activo: true },
        { id: 602, duracionMinutos: 30, precio: 9000, activo: false }
      ],
      tarifasEvento: []
    };

    component.atracciones = [atraccionConInactivas];
    fixture.detectChanges();

    const btn15 = fixture.debugElement.query(By.css('[data-testid="btn-modalidad-6-15"]'));
    const btn30 = fixture.debugElement.query(By.css('[data-testid="btn-modalidad-6-30"]'));

    expect(btn15).toBeTruthy();
    expect(btn30).toBeNull();
  });
});
