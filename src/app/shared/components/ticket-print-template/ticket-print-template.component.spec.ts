import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TicketPrintTemplateComponent } from './ticket-print-template.component';
import { OrdenEmisionFisica } from '../../../core/models/atraccion.model';
import { Ticket } from '../../../core/models/ticket.model';

describe('TicketPrintTemplateComponent (HU-21.05 / HU-21.07)', () => {
  let component: TicketPrintTemplateComponent;
  let fixture: ComponentFixture<TicketPrintTemplateComponent>;

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

  const mockTicket2: Ticket = {
    idTicket: 2,
    uuid: '22222222-3333-4444-8555-666666666666',
    codigoBoleta: 'TDN-2-2026-002',
    codigoQr: '22222222-3333-4444-8555-666666666666',
    atraccionId: 2,
    atraccionNombre: 'Toro Mecánico',
    modalidadEtiqueta: '3 caídas',
    menorNombre: 'Mateo Gómez',
    clienteNombre: 'Carlos Gómez',
    clienteDocumento: '1094888777',
    precioUnitario: 10000,
    estado: 'PENDIENTE'
  };

  const mockOrden: OrdenEmisionFisica = {
    idOrden: 'ORD-2026-999',
    clienteNombre: 'Carlos Gómez',
    metodoPago: 'EFECTIVO',
    granTotal: 19000,
    totalBoletas: 2,
    fechaEmision: new Date('2026-11-02T10:00:00Z'),
    boletas: [mockTicket1, mockTicket2],
    estado: 'PENDIENTE'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketPrintTemplateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TicketPrintTemplateComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render sheets for all tickets from orden input', () => {
    component.orden = mockOrden;
    fixture.detectChanges();

    const sheets = fixture.debugElement.queryAll(By.css('[data-testid^="print-ticket-sheet-"]'));
    expect(sheets.length).toBe(2);

    const sheet0 = fixture.debugElement.query(By.css('[data-testid="print-ticket-sheet-0"]'));
    expect(sheet0.nativeElement.textContent).toContain('Inflable Gigante');
    expect(sheet0.nativeElement.textContent).toContain('Lucas Gómez');
    expect(sheet0.nativeElement.textContent).toContain('TDN-1-2026-001');

    const sheet1 = fixture.debugElement.query(By.css('[data-testid="print-ticket-sheet-1"]'));
    expect(sheet1.nativeElement.textContent).toContain('Toro Mecánico');
    expect(sheet1.nativeElement.textContent).toContain('Mateo Gómez');
    expect(sheet1.nativeElement.textContent).toContain('TDN-2-2026-002');
  });

  it('should apply print-roll-80mm by default and switch to print-roll-58mm', () => {
    component.boletas = [mockTicket1];
    component.paperWidthMm = 80;
    fixture.detectChanges();

    const rootEl = fixture.debugElement.query(By.css('[data-testid="ticket-print-template-container"]'));
    expect(rootEl.nativeElement.classList.contains('print-roll-80mm')).toBe(true);
    expect(rootEl.nativeElement.classList.contains('print-roll-58mm')).toBe(false);

    component.paperWidthMm = 58;
    fixture.detectChanges();

    expect(rootEl.nativeElement.classList.contains('print-roll-58mm')).toBe(true);
    expect(rootEl.nativeElement.classList.contains('print-roll-80mm')).toBe(false);
  });

  it('should render QrViewerComponent inside each ticket sheet', () => {
    component.boletas = [mockTicket1, mockTicket2];
    fixture.detectChanges();

    const qrViewers = fixture.debugElement.queryAll(By.css('app-qr-viewer'));
    expect(qrViewers.length).toBe(2);
  });

  it('should use custom park configuration when provided via input', () => {
    component.boletas = [mockTicket1];
    component.config = {
      nombreComercial: 'Parque Infantil Aventuras',
      nit: '800.555.444-1',
      ciudad: 'Pereira, Risaralda'
    };
    fixture.detectChanges();

    const header = fixture.debugElement.query(By.css('[data-testid="print-parque-header"]'));
    expect(header.nativeElement.textContent).toContain('Parque Infantil Aventuras');
    expect(header.nativeElement.textContent).toContain('800.555.444-1');
    expect(header.nativeElement.textContent).toContain('Pereira, Risaralda');
  });

  it('should render visible ** REIMPRESIÓN ** banner and metadata when ticket has esReimpresion or marcaImpresion (HU-22.05 / Notion: CA-02)', () => {
    const reimpTicket: Ticket = {
      ...mockTicket1,
      esReimpresion: true,
      marcaImpresion: '** REIMPRESIÓN **',
      motivoUltimaReimpresion: 'Atasco de papel'
    };

    component.boletas = [reimpTicket];
    fixture.detectChanges();

    const banner = fixture.debugElement.query(By.css('[data-testid="print-ticket-reimpresion-banner"]'));
    expect(banner).toBeTruthy();
    expect(banner.nativeElement.textContent).toContain('** REIMPRESIÓN **');

    const motivoEl = fixture.debugElement.query(By.css('[data-testid="print-ticket-motivo-reimpresion"]'));
    expect(motivoEl).toBeTruthy();
    expect(motivoEl.nativeElement.textContent).toContain('Atasco de papel');
  });
});
