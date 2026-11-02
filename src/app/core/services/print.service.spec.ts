import { TestBed } from '@angular/core/testing';
import { PrintService } from './print.service';
import { OrdenEmisionFisica } from '../models/atraccion.model';
import { Ticket } from '../models/ticket.model';

describe('PrintService (HU-21.05 / Notion: CA-04)', () => {
  let service: PrintService;

  const mockTicket1: Ticket = {
    idTicket: 1,
    uuid: '11111111-2222-4333-8444-555555555555',
    codigoBoleta: 'TDN-1-2026-001',
    codigoQr: '11111111-2222-4333-8444-555555555555',
    atraccionId: 1,
    atraccionNombre: 'Inflable Gigante',
    modalidadEtiqueta: '15 min',
    menorNombre: 'Lucas Gómez',
    clienteNombre: 'Carlos Gómez',
    clienteDocumento: '1094888777',
    precioUnitario: 9000,
    estado: 'PENDIENTE'
  };

  const mockOrden: OrdenEmisionFisica = {
    idOrden: 'ORD-2026-101',
    clienteNombre: 'Carlos Gómez',
    metodoPago: 'EFECTIVO',
    granTotal: 9000,
    totalBoletas: 1,
    fechaEmision: new Date('2026-11-02T10:00:00Z'),
    boletas: [mockTicket1],
    estado: 'PENDIENTE'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrintService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created with initial default state', () => {
    expect(service).toBeTruthy();
    expect(service.imprimiendo()).toBe(false);
    expect(service.ordenEnImpresion()).toBeNull();
    expect(service.boletasEnImpresion().length).toBe(0);
    expect(service.anchoPapelMm()).toBe(80);
    expect(service.totalImpresionesSesion()).toBe(0);
  });

  it('should update paper width via configurarAnchoPapel', () => {
    service.configurarAnchoPapel(58);
    expect(service.anchoPapelMm()).toBe(58);

    service.configurarAnchoPapel(80);
    expect(service.anchoPapelMm()).toBe(80);
  });

  it('should update park configuration via configurarDatosParque', () => {
    service.configurarDatosParque({
      nombreComercial: 'Territorio de Niños Quindío',
      nit: '900.123.456-7'
    });

    expect(service.configParque()?.nombreComercial).toBe('Territorio de Niños Quindío');
    expect(service.configParque()?.nit).toBe('900.123.456-7');
  });

  it('should execute native window.print() when imprimirOrden is called (SCRUM-376 / HU-21.05)', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    const resultado = service.imprimirOrden(mockOrden, 58);

    expect(resultado).toBe(true);
    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(service.ordenEnImpresion()?.idOrden).toBe('ORD-2026-101');
    expect(service.boletasEnImpresion().length).toBe(1);
    expect(service.anchoPapelMm()).toBe(58);
    expect(service.totalImpresionesSesion()).toBe(1);
    expect(service.imprimiendo()).toBe(false);
  });

  it('should print arbitrary list of tickets via imprimirBoletas', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    const resultado = service.imprimirBoletas([mockTicket1]);

    expect(resultado).toBe(true);
    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(service.boletasEnImpresion().length).toBe(1);
    expect(service.totalImpresionesSesion()).toBe(1);
  });

  it('should handle print errors gracefully and reset imprimiendo signal', () => {
    vi.spyOn(window, 'print').mockImplementation(() => {
      throw new Error('Impresora no disponible');
    });

    const resultado = service.imprimirOrden(mockOrden);

    expect(resultado).toBe(false);
    expect(service.imprimiendo()).toBe(false);
  });
});
