import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditoriaService } from './auditoria.service';

describe('AuditoriaService (HU-38.08, HU-41.05..08)', () => {
  let service: AuditoriaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuditoriaService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AuditoriaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should validate search format for UUID v4 correctly (HU-38.08)', () => {
    const validUuid = '12345678-1234-4234-8234-123456789abc';
    const res = service.validarFormatoBusqueda(validUuid);
    expect(res.esValido).toBe(true);
    expect(res.tipo).toBe('UUID_V4');
  });

  it('should validate search format for national identity document / cédula (HU-38.08)', () => {
    const cedula = '1094857291';
    const res = service.validarFormatoBusqueda(cedula);
    expect(res.esValido).toBe(true);
    expect(res.tipo).toBe('CEDULA');
  });

  it('should reject invalid search format and provide error message', () => {
    const invalidTerm = 'abc$$%';
    const res = service.validarFormatoBusqueda(invalidTerm);
    expect(res.esValido).toBe(false);
    expect(res.tipo).toBe('INVALIDO');
    expect(res.mensajeError).toContain('Formato inválido');
  });

  it('should find ticket dossier with timeline events and technical metadata (HU-38.08..10)', () => {
    let expediente: any = null;
    service.buscarExpedienteTicket('1094857291').subscribe(res => {
      expediente = res;
    });

    const req = httpMock.expectOne(r => r.url.includes('/auditoria/tickets/1094857291'));
    req.error(new ProgressEvent('error'));

    expect(expediente).toBeDefined();
    expect(expediente.ticketUuid).toBeDefined();
    expect(expediente.eventos.length).toBe(4);

    const primerHito = expediente.eventos[0];
    expect(primerHito.tipoHito).toBe('VENTA_CAJA');
    expect(primerHito.metadatos.cajeroEmisor).toContain('Carlos Gómez');
    expect(primerHito.metadatos.direccionIpTerminal).toBe('192.168.10.15');

    const ultimoHito = expediente.eventos[3];
    expect(ultimoHito.tipoHito).toBe('CONFIRMACION_SALIDA');
    expect(ultimoHito.metadatos.duracionMinutosJuego).toBe(18);
  });

  it('should propagate error when backend responds with 404 Not Found instead of returning mock', () => {
    service.buscarExpedienteTicket('1094857291').subscribe({
      next: () => expect.unreachable('Should have failed on 404'),
      error: (err) => {
        expect(err.status).toBe(404);
      }
    });

    const req = httpMock.expectOne(r => r.url.includes('/auditoria/tickets/1094857291'));
    req.flush('No encontrado', { status: 404, statusText: 'Not Found' });
  });

  it('should retrieve incidents and compute inactivity summary with >5min threshold (HU-41.07, HU-41.08)', () => {
    let incidentes: any[] = [];
    service.obtenerIncidentesYPausas().subscribe(res => {
      incidentes = res;
    });

    const req = httpMock.expectOne(r => r.url.includes('/auditoria/incidentes'));
    req.error(new ProgressEvent('error'));

    expect(incidentes.length).toBeGreaterThan(0);
    const mayor5Min = incidentes.filter(i => i.duracionMinutos > 5);
    expect(mayor5Min.length).toBe(2);
    expect(mayor5Min[0].superaUmbralCincoMinutos).toBe(true);

    const resumen = service.obtenerResumenInactividad(incidentes);
    expect(resumen.tiempoTotalSuspensionMinutos).toBe(22); // 3 + 9 + 8 + 2
    expect(resumen.pausasMayoresACincoMinutos).toBe(2);
    expect(resumen.promedioMinutosPausadosPorJuego).toBeGreaterThan(0);
    expect(resumen.promedioMinutosPausadosPorOperario).toBeGreaterThan(0);
  });
});
