import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TiendaService } from './tienda.service';
import {
  CatalogoAtraccionOnline,
  CompraOnlineRequest,
  CompraOnlineResponse,
  ItemCarritoOnline,
  TicketOnline
} from '../models/tienda.model';

describe('TiendaService', () => {
  let service: TiendaService;
  let httpTesting: HttpTestingController;

  const mockCatalogo: CatalogoAtraccionOnline[] = [
    {
      id: 1,
      nombre: 'Piscina de Pelotas',
      descripcion: 'Para los más pequeños',
      tipoAtraccion: 'TEMPORIZADA',
      cuposLibres: 12,
      capacidadMaxima: 15,
      edadMinima: 2,
      edadMaxima: 8,
      tarifaMinuto: 1000,
      duracionRecomendadaMinutos: 20,
      tarifasTiempo: [
        { id: 10, duracionMinutos: 20, precio: 8000 }
      ],
      tarifasEvento: []
    }
  ];

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        TiendaService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(TiendaService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('debe crearse correctamente con estado inicial vacío', () => {
    expect(service).toBeTruthy();
    expect(service.catalogo()).toEqual([]);
    expect(service.carrito()).toEqual([]);
    expect(service.totalItems()).toBe(0);
    expect(service.subtotal()).toBe(0);
  });

  it('debe obtener el catálogo desde el backend y actualizar el signal', () => {
    service.obtenerCatalogo().subscribe((items) => {
      expect(items.length).toBe(1);
      expect(items[0].nombre).toBe('Piscina de Pelotas');
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/tienda/catalogo'));
    expect(req.request.method).toBe('GET');
    req.flush(mockCatalogo);

    expect(service.catalogo().length).toBe(1);
    expect(service.cargandoCatalogo()).toBe(false);
  });

  it('debe gestionar ítems del carrito y calcular subtotales e impuestos', () => {
    const item1: ItemCarritoOnline = {
      id: 'item-1',
      atraccionId: 1,
      nombreAtraccion: 'Piscina de Pelotas',
      tipoAtraccion: 'TEMPORIZADA',
      tipoTarifa: 'TIEMPO',
      tarifaTiempoId: 10,
      duracionMinutos: 20,
      precioUnitario: 8000,
      cantidad: 2,
      subtotal: 16000,
      nombreMenor: 'Juanita',
      edadMenor: 5
    };

    service.agregarAlCarrito(item1);
    expect(service.carrito().length).toBe(1);
    expect(service.totalItems()).toBe(2);
    expect(service.subtotal()).toBe(16000);
    expect(service.impuestosEstimados()).toBe(Math.round(16000 * 0.19));
    expect(service.totalPagar()).toBe(16000 + Math.round(16000 * 0.19));

    // Actualizar cantidad
    service.actualizarCantidad('item-1', 1);
    expect(service.totalItems()).toBe(3);
    expect(service.subtotal()).toBe(24000);

    // Disminuir hasta eliminar
    service.actualizarCantidad('item-1', -3);
    expect(service.carrito().length).toBe(0);
    expect(service.totalItems()).toBe(0);
  });

  it('debe procesar la compra, limpiar la cesta y guardar los boletos emitidos', () => {
    const item1: ItemCarritoOnline = {
      id: 'item-1',
      atraccionId: 1,
      nombreAtraccion: 'Piscina de Pelotas',
      tipoAtraccion: 'TEMPORIZADA',
      tipoTarifa: 'TIEMPO',
      tarifaTiempoId: 10,
      duracionMinutos: 20,
      precioUnitario: 8000,
      cantidad: 1,
      subtotal: 8000,
      nombreMenor: 'Juanita',
      edadMenor: 5
    };
    service.agregarAlCarrito(item1);
    service.abrirCarrito();
    expect(service.carritoAbierto()).toBe(true);

    const mockResponse: CompraOnlineResponse = {
      ventaId: 50,
      codigoOrden: 'ORD-TEST-99',
      fechaVenta: '2026-11-20T20:00:00',
      montoTotal: 9520,
      subtotal: 8000,
      impuestos: 1520,
      metodoPago: 'NEQUI',
      canalVenta: 'ONLINE',
      clienteNombre: 'Pedro Pérez',
      clienteDocumento: '1098765432',
      boletas: [
        {
          uuidCodigo: '550e8400-e29b-41d4-a716-446655440000',
          codigoCorto: 'TDN-A1B2C3D4',
          nombreAtraccion: 'Piscina de Pelotas',
          tipoAtraccion: 'TEMPORIZADA',
          tipoTarifa: 'TIEMPO',
          duracionMinutos: 20,
          intentosTotales: null,
          intentosRestantes: null,
          nombreMenor: 'Juanita',
          estadoTicket: 'PAGADO',
          fechaEmision: '2026-11-20T20:00:00'
        }
      ],
      mensaje: 'Compra exitosa'
    };

    const reqDto: CompraOnlineRequest = {
      documentoAdulto: '1098765432',
      nombreAdulto: 'Pedro Pérez',
      metodoPago: 'NEQUI',
      items: [
        {
          atraccionId: 1,
          tipoTarifa: 'TIEMPO',
          tarifaTiempoId: 10,
          duracionMinutos: 20,
          cantidad: 1,
          nombreMenor: 'Juanita',
          edadMenor: 5
        }
      ]
    };

    service.procesarCompra(reqDto).subscribe((res) => {
      expect(res.codigoOrden).toBe('ORD-TEST-99');
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/tienda/comprar'));
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);

    expect(service.carrito().length).toBe(0);
    expect(service.carritoAbierto()).toBe(false);
    expect(service.ordenReciente()?.codigoOrden).toBe('ORD-TEST-99');
    expect(service.boletosLocales().length).toBe(1);
    expect(service.boletosLocales()[0].codigoCorto).toBe('TDN-A1B2C3D4');
  });

  it('debe consultar boletos por identificador', () => {
    const mockBoletos: TicketOnline[] = [
      {
        uuidCodigo: '550e8400-e29b-41d4-a716-446655440000',
        codigoCorto: 'TDN-A1B2C3D4',
        nombreAtraccion: 'Piscina de Pelotas',
        tipoAtraccion: 'TEMPORIZADA',
        tipoTarifa: 'TIEMPO',
        nombreMenor: 'Juanita',
        estadoTicket: 'PAGADO',
        fechaEmision: '2026-11-20T20:00:00'
      }
    ];

    service.consultarBoletos('1098765432').subscribe((res) => {
      expect(res.length).toBe(1);
      expect(res[0].codigoCorto).toBe('TDN-A1B2C3D4');
    });

    const req = httpTesting.expectOne(
      (r) => r.url.endsWith('/tienda/mis-boletos') && r.params.get('identificador') === '1098765432'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockBoletos);

    expect(service.boletosLocales().length).toBe(1);
  });
});
