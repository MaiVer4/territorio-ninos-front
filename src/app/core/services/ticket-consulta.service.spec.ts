import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TicketConsultaService } from './ticket-consulta.service';
import { ColaEmisionService } from './cola-emision.service';
import { Ticket } from '../models/ticket.model';

describe('TicketConsultaService (HU-23.04 / HU-23.05)', () => {
  let service: TicketConsultaService;
  let httpMock: HttpTestingController;
  let colaEmisionService: ColaEmisionService;

  const mockTicketPagado: Ticket = {
    idTicket: 1,
    uuid: '11111111-aaaa-bbbb-cccc-111111111111',
    codigoBoleta: 'TDN-1-2026-001',
    atraccionId: 1,
    atraccionNombre: 'Inflable Gigante',
    tipoAtraccion: 'TEMPORIZADA',
    modalidadEtiqueta: '15 min',
    duracionMinutos: 15,
    clienteDocumento: '1098765432',
    clienteNombre: 'Carlos Ruiz',
    menorNombre: 'Leo Ruiz',
    precioUnitario: 9000,
    estado: 'PAGADO',
    fechaEmision: new Date('2026-11-02T10:00:00Z')
  };

  const mockTicketEnUso: Ticket = {
    idTicket: 2,
    uuid: '22222222-aaaa-bbbb-cccc-222222222222',
    codigoBoleta: 'TDN-2-2026-002',
    atraccionId: 2,
    atraccionNombre: 'Camas Elásticas',
    tipoAtraccion: 'TEMPORIZADA',
    modalidadEtiqueta: '20 min',
    duracionMinutos: 20,
    tiempoRestanteMinutos: 8,
    clienteDocumento: '1098765432',
    clienteNombre: 'Carlos Ruiz',
    menorNombre: 'Leo Ruiz',
    precioUnitario: 12000,
    estado: 'EN_USO',
    fechaEmision: new Date('2026-11-02T10:30:00Z')
  };

  const mockTicketConsumido: Ticket = {
    idTicket: 3,
    uuid: '33333333-aaaa-bbbb-cccc-333333333333',
    codigoBoleta: 'TDN-3-2026-003',
    atraccionId: 3,
    atraccionNombre: 'Toro Mecánico',
    tipoAtraccion: 'EVENTOS_CAIDAS',
    modalidadEtiqueta: '3 caídas',
    caidasPermitidas: 3,
    caidasRestantes: 0,
    clienteDocumento: '77889900',
    clienteNombre: 'Martha Gómez',
    menorNombre: 'Sofía Gómez',
    precioUnitario: 10000,
    estado: 'CONSUMIDO',
    fechaEmision: new Date('2026-11-02T09:00:00Z')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TicketConsultaService,
        ColaEmisionService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(TicketConsultaService);
    httpMock = TestBed.inject(HttpTestingController);
    colaEmisionService = TestBed.inject(ColaEmisionService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('obtenerEstadoVisual (SCRUM-387 / HU-23.05)', () => {
    it('should map PAGADO, EMITIDA, GENERADO to PAGADO', () => {
      expect(service.obtenerEstadoVisual({ ...mockTicketPagado, estado: 'PAGADO' })).toBe('PAGADO');
      expect(service.obtenerEstadoVisual({ ...mockTicketPagado, estado: 'EMITIDA' })).toBe('PAGADO');
      expect(service.obtenerEstadoVisual({ ...mockTicketPagado, estado: 'GENERADO' })).toBe('PAGADO');
    });

    it('should map EN_USO to EN_USO', () => {
      expect(service.obtenerEstadoVisual(mockTicketEnUso)).toBe('EN_USO');
    });

    it('should map CONSUMIDO, FINALIZADO, ANULADO to CONSUMIDO', () => {
      expect(service.obtenerEstadoVisual(mockTicketConsumido)).toBe('CONSUMIDO');
      expect(service.obtenerEstadoVisual({ ...mockTicketConsumido, estado: 'FINALIZADO' })).toBe('CONSUMIDO');
      expect(service.obtenerEstadoVisual({ ...mockTicketConsumido, estado: 'ANULADO' })).toBe('CONSUMIDO');
    });
  });

  describe('calcularTiempoRestanteInfo (SCRUM-387 / HU-23.05)', () => {
    it('should calculate 100% available time for PAGADO temporizada ticket', () => {
      const info = service.calcularTiempoRestanteInfo(mockTicketPagado);
      expect(info.minutosRestantes).toBe(15);
      expect(info.porcentaje).toBe(100);
      expect(info.agotado).toBe(false);
      expect(info.etiqueta).toContain('15 min disponibles');
    });

    it('should calculate elapsed progress for EN_USO temporizada ticket', () => {
      const info = service.calcularTiempoRestanteInfo(mockTicketEnUso);
      expect(info.minutosRestantes).toBe(8);
      expect(info.porcentaje).toBe(40); // 8 / 20 = 40%
      expect(info.agotado).toBe(false);
      expect(info.etiqueta).toContain('8 min restantes');
    });

    it('should return 0 minutes and agotado=true for CONSUMIDO temporizada ticket', () => {
      const consumedTimed: Ticket = {
        ...mockTicketPagado,
        estado: 'CONSUMIDO'
      };
      const info = service.calcularTiempoRestanteInfo(consumedTimed);
      expect(info.minutosRestantes).toBe(0);
      expect(info.porcentaje).toBe(0);
      expect(info.agotado).toBe(true);
      expect(info.etiqueta).toContain('Tiempo agotado');
    });

    it('should calculate remaining falls for EVENTOS_CAIDAS ticket', () => {
      const eventTicket: Ticket = {
        ...mockTicketConsumido,
        estado: 'PAGADO',
        caidasRestantes: 2
      };
      const info = service.calcularTiempoRestanteInfo(eventTicket);
      expect(info.caidasRestantes).toBe(2);
      expect(info.porcentaje).toBe(67); // 2/3 = 66.6% -> 67%
      expect(info.agotado).toBe(false);
      expect(info.etiqueta).toContain('2 de 3 caídas');
    });
  });

  describe('buscarTickets (HU-23.04)', () => {
    it('should search tickets via HTTP and return matching tickets', () => {
      const mockResultados = [mockTicketPagado, mockTicketEnUso];

      service.buscarTickets('1098765432').subscribe(tickets => {
        expect(tickets.length).toBe(2);
        expect(tickets[0].clienteDocumento).toBe('1098765432');
      });

      const req = httpMock.expectOne(r => r.url.includes('/tickets/buscar') && r.params.get('criterio') === '1098765432');
      expect(req.request.method).toBe('GET');
      req.flush(mockResultados);
    });

    it('should fallback to local queue tickets when backend returns error or 404', () => {
      // Seed local queue
      colaEmisionService.historialTicketsTurno.set([mockTicketPagado, mockTicketConsumido]);

      service.buscarTickets('1098765432').subscribe(tickets => {
        expect(tickets.length).toBe(1);
        expect(tickets[0].uuid).toBe(mockTicketPagado.uuid);
      });

      const req = httpMock.expectOne(r => r.url.includes('/tickets/buscar'));
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should filter results by visual state pill (PAGADO, EN_USO, CONSUMIDO)', () => {
      colaEmisionService.historialTicketsTurno.set([mockTicketPagado, mockTicketEnUso, mockTicketConsumido]);

      service.buscarTickets('', 'CONSUMIDO').subscribe(tickets => {
        expect(tickets.length).toBe(1);
        expect(tickets[0].codigoBoleta).toBe(mockTicketConsumido.codigoBoleta);
      });

      const req = httpMock.expectOne(r => r.url.includes('/tickets/buscar'));
      req.flush([mockTicketPagado, mockTicketEnUso, mockTicketConsumido]);
    });
  });
});
