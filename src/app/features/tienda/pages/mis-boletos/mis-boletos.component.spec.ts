import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MisBoletosComponent } from './mis-boletos.component';
import { TiendaService } from '../../../../core/services/tienda.service';
import { TicketOnline } from '../../../../core/models/tienda.model';

describe('MisBoletosComponent', () => {
  let component: MisBoletosComponent;
  let fixture: ComponentFixture<MisBoletosComponent>;
  let tiendaService: TiendaService;
  let httpTesting: HttpTestingController;

  const mockBoletos: TicketOnline[] = [
    {
      uuidCodigo: '550e8400-e29b-41d4-a716-446655440000',
      codigoCorto: 'TDN-A1B2C3D4',
      nombreAtraccion: 'Camas Elásticas',
      tipoAtraccion: 'TEMPORIZADA',
      tipoTarifa: 'TIEMPO',
      duracionMinutos: 30,
      intentosTotales: null,
      intentosRestantes: null,
      nombreMenor: 'Valentina López',
      estadoTicket: 'PAGADO',
      fechaEmision: '2026-11-20T21:00:00'
    }
  ];

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MisBoletosComponent],
      providers: [
        TiendaService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    tiendaService = TestBed.inject(TiendaService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('debe crearse y generar el código QR para boletos en memoria', async () => {
    tiendaService.boletosLocales.set(mockBoletos);
    fixture = TestBed.createComponent(MisBoletosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Permitir resolución asíncrona de QRCode.toDataURL
    await new Promise((resolve) => setTimeout(resolve, 50));
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.boletosConQr().length).toBe(1);
    expect(component.boletosConQr()[0].codigoCorto).toBe('TDN-A1B2C3D4');
    expect(component.boletosConQr()[0].qrDataUrl).toBeDefined();
    expect(component.boletosConQr()[0].qrDataUrl).toContain('data:image/png;base64');
  });

  it('debe buscar boletos por documento o correo vía HTTP', async () => {
    fixture = TestBed.createComponent(MisBoletosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.criterioBusqueda = '1098765432';
    component.buscarBoletos();
    expect(component.buscando()).toBe(true);

    const req = httpTesting.expectOne(
      (r) => r.url.endsWith('/tienda/mis-boletos') && r.params.get('identificador') === '1098765432'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockBoletos);

    await new Promise((resolve) => setTimeout(resolve, 50));
    fixture.detectChanges();

    expect(component.buscando()).toBe(false);
    expect(component.boletosConQr().length).toBe(1);
  });
});
