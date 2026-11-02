import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketTimelineComponent } from './ticket-timeline.component';
import { AuditoriaTicket } from '../../../../core/models/auditoria.model';
import { By } from '@angular/platform-browser';

describe('TicketTimelineComponent (HU-38.09, HU-38.10)', () => {
  let component: TicketTimelineComponent;
  let fixture: ComponentFixture<TicketTimelineComponent>;

  const mockAuditoria: AuditoriaTicket = {
    ticketUuid: '12345678-1234-4234-8234-123456789abc',
    codigoBoleta: 'BOL-112233',
    clienteDocumento: '1094857291',
    clienteNombre: 'Carolina Ramírez',
    menorNombre: 'Samuel',
    menorEdad: 6,
    atraccionNombre: 'Laberinto Mágico',
    modalidad: '15 minutos',
    valorPagado: 15000,
    metodoPago: 'EFECTIVO',
    estadoActual: 'CONSUMIDO',
    fechaCompra: '2026-10-22 10:14:00',
    eventos: [
      {
        idEvento: 'EVT-01',
        tipoHito: 'VENTA_CAJA',
        titulo: 'Venta en Caja',
        descripcion: 'Emisión de boleta',
        fechaHora: '2026-10-22 10:14:00',
        icono: 'point_of_sale',
        colorEstado: 'emerald',
        metadatos: {
          cajeroEmisor: 'Carlos Gómez',
          estacionFisica: 'Caja 01',
          direccionIpTerminal: '192.168.10.15'
        }
      },
      {
        idEvento: 'EVT-02',
        tipoHito: 'ESCANEO_ACCESO',
        titulo: 'Escaneo en Acceso',
        descripcion: 'Acceso a atracción',
        fechaHora: '2026-10-22 10:25:00',
        icono: 'qr_code_scanner',
        colorEstado: 'blue',
        metadatos: {
          operarioValidador: 'Andrés Morales',
          estacionFisica: 'Torniquete Laberinto',
          duracionMinutosJuego: 15,
          direccionIpTerminal: '192.168.10.42'
        }
      }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketTimelineComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TicketTimelineComponent);
    component = fixture.componentInstance;
    component.auditoria = mockAuditoria;
    fixture.detectChanges();
  });

  it('should render ticket summary with ticket code and child name (HU-38.08)', () => {
    const codigoEl = fixture.debugElement.query(By.css('[data-testid="timeline-codigo-boleta"]'));
    expect(codigoEl).toBeTruthy();
    expect(codigoEl.nativeElement.textContent).toContain('BOL-112233');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Samuel (6a)');
    expect(compiled.textContent).toContain('Carolina Ramírez');
    expect(compiled.textContent).toContain('192.168.10.15');
  });

  it('should toggle collapsible metadata panel on button click (HU-38.10)', () => {
    // EVT-02 is not expanded initially
    expect(component.esMetadatosVisible('EVT-02')).toBe(false);

    const btnToggle = fixture.debugElement.query(By.css('[data-testid="btn-toggle-metadatos-EVT-02"]'));
    expect(btnToggle).toBeTruthy();

    btnToggle.nativeElement.click();
    fixture.detectChanges();

    expect(component.esMetadatosVisible('EVT-02')).toBe(true);
    const panel = fixture.debugElement.query(By.css('[data-testid="panel-metadatos-EVT-02"]'));
    expect(panel).toBeTruthy();
    expect(panel.nativeElement.textContent).toContain('Andrés Morales');
    expect(panel.nativeElement.textContent).toContain('192.168.10.42');
    expect(panel.nativeElement.textContent).toContain('15 minutos');
  });
});
