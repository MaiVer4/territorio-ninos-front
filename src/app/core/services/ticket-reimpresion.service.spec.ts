import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TicketReimpresionService } from './ticket-reimpresion.service';
import { AuthService } from './auth.service';
import { EventoReimpresionDTO, Ticket } from '../models/ticket.model';
import { signal } from '@angular/core';

describe('TicketReimpresionService', () => {
  let service: TicketReimpresionService;
  let httpMock: HttpTestingController;

  const mockTicket: Ticket = {
    idTicket: 10,
    uuid: '11111111-2222-3333-4444-555555555555',
    codigoBoleta: 'TDN-1-100-001',
    atraccionId: 1,
    atraccionNombre: 'Inflable Gigante',
    modalidadEtiqueta: '15 min',
    menorNombre: 'Samuel Pérez',
    precioUnitario: 9000,
    estado: 'EMITIDA'
  };

  const mockAuthService = {
    currentUser: signal({ correo: 'taquillero@tdn.com.co', rol: 'TAQUILLERO' }),
    currentUserName: signal('Taquillero de Prueba')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TicketReimpresionService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    service = TestBed.inject(TicketReimpresionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.historialReimpresiones().length).toBe(0);
    expect(service.ultimaReimpresion()).toBeNull();
  });

  it('should validate that motivo is not blank (@NotBlank) and throw error', () => {
    service.solicitarReimpresion(mockTicket, { motivo: '   ' }).subscribe({
      next: () => expect.unreachable('Should have failed'),
      error: (err) => {
        expect(err.message).toContain('El motivo de la reimpresión es obligatorio');
      }
    });
  });

  it('should block reimpresion and return HTTP 409 Conflict if ticket is CONSUMIDO', () => {
    const consumedTicket: Ticket = {
      ...mockTicket,
      estado: 'CONSUMIDO'
    };

    service.solicitarReimpresion(consumedTicket, { motivo: 'Atasco de papel' }).subscribe({
      next: () => expect.unreachable('Should have failed with 409'),
      error: (err) => {
        expect(err.status).toBe(409);
        expect(err.error.message).toContain('CONSUMIDO');
      }
    });
  });

  it('should send POST to /api/tickets/{uuid}/reimprimir and return EventoReimpresionDTO with marca visible', () => {
    const mockResponse: EventoReimpresionDTO = {
      idLog: 'LOG-777',
      ticketUuid: mockTicket.uuid!,
      codigoBoleta: mockTicket.codigoBoleta,
      usuarioId: 'taquillero@tdn.com.co',
      usuarioNombre: 'Taquillero de Prueba',
      motivo: 'Atasco de papel en rodillo',
      fechaReimpresion: '2026-11-02T19:00:00Z',
      marcaImpresion: '** REIMPRESIÓN **'
    };

    service.solicitarReimpresion(mockTicket, { motivo: 'Atasco de papel en rodillo' }).subscribe(res => {
      expect(res.idLog).toBe('LOG-777');
      expect(res.marcaImpresion).toBe('** REIMPRESIÓN **');
      expect(res.motivo).toBe('Atasco de papel en rodillo');
      expect(service.historialReimpresiones().length).toBe(1);
      expect(service.ultimaReimpresion()?.idLog).toBe('LOG-777');
    });

    const req = httpMock.expectOne(r => r.url.includes(`/tickets/${mockTicket.uuid}/reimprimir`));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ motivo: 'Atasco de papel en rodillo' });
    req.flush(mockResponse);
  });

  it('should reject reimpresion and propagate error when backend responds with 404 Not Found', () => {
    service.solicitarReimpresion(mockTicket, { motivo: 'Falta de papel' }).subscribe({
      next: () => expect.unreachable('Should have failed on 404'),
      error: (err) => {
        expect(err.status).toBe(404);
      }
    });

    const req = httpMock.expectOne(r => r.url.includes(`/tickets/${mockTicket.uuid}/reimprimir`));
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('should generate fallback local event with stamp when offline (status 0)', () => {
    service.solicitarReimpresion(mockTicket, { motivo: 'Falta de papel' }).subscribe(res => {
      expect(res.idLog).toContain('LOG-');
      expect(res.marcaImpresion).toBe('** REIMPRESIÓN **');
      expect(res.motivo).toBe('Falta de papel');
      expect(res.ticketUuid).toBe(mockTicket.uuid);
      expect(service.historialReimpresiones().length).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url.includes(`/tickets/${mockTicket.uuid}/reimprimir`));
    req.error(new ProgressEvent('error'));
  });
});
