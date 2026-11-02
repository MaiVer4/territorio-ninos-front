import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConsultaTicketsComponent } from './consulta-tickets.component';
import { TicketConsultaService } from '../../../../core/services/ticket-consulta.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Ticket } from '../../../../core/models/ticket.model';

describe('ConsultaTicketsComponent (HU-23.04, HU-23.05, HU-23.06)', () => {
  let component: ConsultaTicketsComponent;
  let fixture: ComponentFixture<ConsultaTicketsComponent>;
  let ticketConsultaServiceSpy: any;
  let notificationServiceSpy: any;

  const mockTickets: Ticket[] = [
    {
      idTicket: 1,
      uuid: 'uuid-1111-pagado',
      codigoBoleta: 'TDN-1-001',
      atraccionNombre: 'Inflable Gigante',
      tipoAtraccion: 'TEMPORIZADA',
      modalidadEtiqueta: '15 min',
      duracionMinutos: 15,
      clienteDocumento: '1098765432',
      clienteNombre: 'Carlos Ruiz',
      menorNombre: 'Leo Ruiz',
      precioUnitario: 9000,
      estado: 'PAGADO',
      fechaEmision: new Date('2026-11-02T10:00:00Z'),
      horaCompra: new Date('2026-11-02T10:00:00Z')
    },
    {
      idTicket: 2,
      uuid: 'uuid-2222-enuso',
      codigoBoleta: 'TDN-2-002',
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
      fechaEmision: new Date('2026-11-02T10:15:00Z'),
      horaCompra: new Date('2026-11-02T10:15:00Z')
    },
    {
      idTicket: 3,
      uuid: 'uuid-3333-consumido',
      codigoBoleta: 'TDN-3-003',
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
      fechaEmision: new Date('2026-11-02T09:00:00Z'),
      horaCompra: new Date('2026-11-02T09:00:00Z')
    }
  ];

  beforeEach(async () => {
    ticketConsultaServiceSpy = {
      buscarTickets: vi.fn().mockReturnValue(of(mockTickets)),
      obtenerEstadoVisual: vi.fn().mockImplementation((t: Ticket) => {
        if (t.estado === 'CONSUMIDO') return 'CONSUMIDO';
        if (t.estado === 'EN_USO') return 'EN_USO';
        return 'PAGADO';
      }),
      calcularTiempoRestanteInfo: vi.fn().mockImplementation((t: Ticket) => {
        if (t.estado === 'CONSUMIDO') {
          return { etiqueta: 'Tiempo agotado (0 min)', minutosRestantes: 0, porcentaje: 0, agotado: true };
        }
        if (t.estado === 'EN_USO') {
          return { etiqueta: '8 min restantes de 20 min', minutosRestantes: 8, porcentaje: 40, agotado: false };
        }
        return { etiqueta: '15 min disponibles', minutosRestantes: 15, porcentaje: 100, agotado: false };
      })
    };

    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ConsultaTicketsComponent],
      providers: [
        { provide: TicketConsultaService, useValue: ticketConsultaServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConsultaTicketsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and load tickets on init', () => {
    expect(component).toBeTruthy();
    expect(ticketConsultaServiceSpy.buscarTickets).toHaveBeenCalledWith('', 'TODOS');
    expect(component.tickets().length).toBe(3);
  });

  it('should render all 3 ticket rows in the results table', () => {
    const tableEl = fixture.debugElement.query(By.css('[data-testid="tabla-consulta-tickets"]'));
    expect(tableEl).toBeTruthy();

    const rowPagado = fixture.debugElement.query(By.css('[data-testid="fila-ticket-uuid-1111-pagado"]'));
    const rowEnUso = fixture.debugElement.query(By.css('[data-testid="fila-ticket-uuid-2222-enuso"]'));
    const rowConsumido = fixture.debugElement.query(By.css('[data-testid="fila-ticket-uuid-3333-consumido"]'));

    expect(rowPagado).toBeTruthy();
    expect(rowEnUso).toBeTruthy();
    expect(rowConsumido).toBeTruthy();
  });

  it('should filter table when typing a document term and clicking Buscar (HU-23.04)', () => {
    ticketConsultaServiceSpy.buscarTickets.mockReturnValue(of([mockTickets[0], mockTickets[1]]));

    component.terminoBusqueda.set('1098765432');
    fixture.detectChanges();

    const btnBuscar = fixture.debugElement.query(By.css('[data-testid="btn-buscar-tickets"]'));
    btnBuscar.nativeElement.click();
    fixture.detectChanges();

    expect(ticketConsultaServiceSpy.buscarTickets).toHaveBeenCalledWith('1098765432', 'TODOS');
    expect(component.tickets().length).toBe(2);
  });

  it('should filter results by status pills (PAGADO, EN_USO, CONSUMIDO)', () => {
    const btnFiltroPagado = fixture.debugElement.query(By.css('[data-testid="btn-filtro-PAGADO"]'));
    btnFiltroPagado.nativeElement.click();
    fixture.detectChanges();

    expect(component.filtroEstado()).toBe('PAGADO');
    expect(component.ticketsFiltrados().length).toBe(1);
    expect(component.ticketsFiltrados()[0].codigoBoleta).toBe('TDN-1-001');

    const btnFiltroConsumido = fixture.debugElement.query(By.css('[data-testid="btn-filtro-CONSUMIDO"]'));
    btnFiltroConsumido.nativeElement.click();
    fixture.detectChanges();

    expect(component.filtroEstado()).toBe('CONSUMIDO');
    expect(component.ticketsFiltrados().length).toBe(1);
    expect(component.ticketsFiltrados()[0].codigoBoleta).toBe('TDN-3-003');
  });

  it('should render detail card with visual pill, horaCompra, and tiempoRestante when a row is selected (HU-23.05 / SCRUM-387)', () => {
    // Select the EN_USO ticket
    component.seleccionarTicket(mockTickets[1]);
    fixture.detectChanges();

    const cardDetalle = fixture.debugElement.query(By.css('[data-testid="tarjeta-detalle-ticket"]'));
    expect(cardDetalle).toBeTruthy();

    const pillEstado = fixture.debugElement.query(By.css('[data-testid="detalle-pill-estado"]'));
    expect(pillEstado.nativeElement.textContent).toContain('EN_USO');

    const horaCompra = fixture.debugElement.query(By.css('[data-testid="detalle-hora-compra"]'));
    expect(horaCompra).toBeTruthy();

    const tiempoRestante = fixture.debugElement.query(By.css('[data-testid="detalle-tiempo-restante"]'));
    expect(tiempoRestante.nativeElement.textContent).toContain('8 min restantes');

    const barraTiempo = fixture.debugElement.query(By.css('[data-testid="detalle-barra-tiempo"]'));
    expect(barraTiempo).toBeTruthy();
    expect(barraTiempo.styles['width']).toBe('40%');
  });

  it('should trigger direct re-print from table row when ticket is PAGADO or EN_USO (HU-23.06 / SCRUM-388)', () => {
    const reimpSpy = vi.spyOn(component.reimprimirTicket, 'emit');

    const btnReimpPagado = fixture.debugElement.query(By.css('[data-testid="btn-reimprimir-tabla-uuid-1111-pagado"]'));
    expect(btnReimpPagado.nativeElement.disabled).toBe(false);

    btnReimpPagado.nativeElement.click();
    expect(reimpSpy).toHaveBeenCalledWith(mockTickets[0]);
  });

  it('should disable direct re-print button in table and detail card when ticket is CONSUMIDO (CA-01, CA-04)', () => {
    const reimpSpy = vi.spyOn(component.reimprimirTicket, 'emit');

    const btnReimpConsumido = fixture.debugElement.query(By.css('[data-testid="btn-reimprimir-tabla-uuid-3333-consumido"]'));
    expect(btnReimpConsumido.nativeElement.disabled).toBe(true);

    btnReimpConsumido.nativeElement.click();
    expect(reimpSpy).not.toHaveBeenCalled();

    // Select the consumed ticket
    component.seleccionarTicket(mockTickets[2]);
    fixture.detectChanges();

    const btnReimpDetalle = fixture.debugElement.query(By.css('[data-testid="btn-reimprimir-detalle"]'));
    expect(btnReimpDetalle.nativeElement.disabled).toBe(true);
  });

  it('should emit cerrar when clicking close button in modal mode', () => {
    component.modoModal = true;
    fixture.detectChanges();

    const cerrarSpy = vi.spyOn(component.cerrar, 'emit');
    const btnCerrar = fixture.debugElement.query(By.css('[data-testid="btn-cerrar-consulta-modal"]'));
    expect(btnCerrar).toBeTruthy();

    btnCerrar.nativeElement.click();
    expect(cerrarSpy).toHaveBeenCalled();
  });
});
