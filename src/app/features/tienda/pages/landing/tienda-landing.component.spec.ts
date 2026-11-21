import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TiendaLandingComponent } from './tienda-landing.component';
import { TiendaService } from '../../../../core/services/tienda.service';
import { CatalogoAtraccionOnline } from '../../../../core/models/tienda.model';

describe('TiendaLandingComponent', () => {
  let component: TiendaLandingComponent;
  let fixture: ComponentFixture<TiendaLandingComponent>;
  let tiendaService: TiendaService;
  let httpTesting: HttpTestingController;

  const mockCatalogo: CatalogoAtraccionOnline[] = [
    {
      id: 1,
      nombre: 'Inflable Gigante',
      descripcion: 'Castillo inflable con tobogán',
      tipoAtraccion: 'TEMPORIZADA',
      cuposLibres: 8,
      capacidadMaxima: 10,
      edadMinima: 3,
      edadMaxima: 12,
      tarifaMinuto: 1000,
      duracionRecomendadaMinutos: 15,
      tarifasTiempo: [
        { id: 101, duracionMinutos: 15, precio: 6000 }
      ],
      tarifasEvento: []
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TiendaLandingComponent],
      providers: [
        TiendaService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TiendaLandingComponent);
    component = fixture.componentInstance;
    tiendaService = TestBed.inject(TiendaService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('debe crearse y solicitar el catálogo de atracciones al iniciar', () => {
    fixture.detectChanges();

    const req = httpTesting.expectOne((r) => r.url.endsWith('/tienda/catalogo'));
    expect(req.request.method).toBe('GET');
    req.flush(mockCatalogo);

    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(tiendaService.catalogo().length).toBe(1);
    expect(tiendaService.catalogo()[0].nombre).toBe('Inflable Gigante');
  });

  it('debe abrir el modal de configuración de boleta al seleccionar una atracción', () => {
    fixture.detectChanges();
    const req = httpTesting.expectOne((r) => r.url.endsWith('/tienda/catalogo'));
    req.flush(mockCatalogo);
    fixture.detectChanges();

    expect(component.atraccionSeleccionada()).toBeNull();
    component.abrirModalAtraccion(mockCatalogo[0]);
    expect(component.atraccionSeleccionada()).toEqual(mockCatalogo[0]);
  });

  it('debe calcular correctamente el precio desde para la atracción', () => {
    const precio = component.calcularPrecioDesde(mockCatalogo[0]);
    expect(precio).toBe(6000);
  });
});
