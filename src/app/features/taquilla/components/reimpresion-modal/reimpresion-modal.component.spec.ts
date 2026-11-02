import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ReimpresionModalComponent } from './reimpresion-modal.component';
import { Ticket } from '../../../../core/models/ticket.model';

describe('ReimpresionModalComponent (HU-22.06 / SCRUM-382)', () => {
  let component: ReimpresionModalComponent;
  let fixture: ComponentFixture<ReimpresionModalComponent>;

  const mockTicket: Ticket = {
    idTicket: 1,
    uuid: 'uuid-1234-5678',
    codigoBoleta: 'TDN-1-2026-001',
    atraccionId: 1,
    atraccionNombre: 'Inflable Gigante',
    modalidadEtiqueta: '15 min',
    menorNombre: 'Lucas Gómez',
    precioUnitario: 9000,
    estado: 'EMITIDA'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReimpresionModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ReimpresionModalComponent);
    component = fixture.componentInstance;
    component.ticket = mockTicket;
    fixture.detectChanges();
  });

  it('should create the modal component', () => {
    expect(component).toBeTruthy();
  });

  it('should display ticket details in the summary section', () => {
    const resumenEl = fixture.debugElement.query(By.css('[data-testid="resumen-boleta-reimpresion"]'));
    expect(resumenEl).toBeTruthy();
    expect(resumenEl.nativeElement.textContent).toContain('TDN-1-2026-001');
    expect(resumenEl.nativeElement.textContent).toContain('Inflable Gigante');
    expect(resumenEl.nativeElement.textContent).toContain('Lucas Gómez');
    expect(resumenEl.nativeElement.textContent).toContain('9.000');
  });

  it('should render the 3 mandatory reason buttons', () => {
    const btnAtasco = fixture.debugElement.query(By.css('[data-testid="btn-motivo-ATASCO_PAPEL"]'));
    const btnFalta = fixture.debugElement.query(By.css('[data-testid="btn-motivo-FALTA_PAPEL"]'));
    const btnIlegible = fixture.debugElement.query(By.css('[data-testid="btn-motivo-BOLETA_ILEGIBLE"]'));

    expect(btnAtasco).toBeTruthy();
    expect(btnFalta).toBeTruthy();
    expect(btnIlegible).toBeTruthy();
  });

  it('should disable confirm button when no reason is selected', () => {
    const btnConfirmar = fixture.debugElement.query(By.css('[data-testid="btn-confirmar-reimpresion"]'));
    expect(btnConfirmar.nativeElement.disabled).toBe(true);
  });

  it('should enable confirm button after selecting a reason', () => {
    const btnAtasco = fixture.debugElement.query(By.css('[data-testid="btn-motivo-ATASCO_PAPEL"]'));
    btnAtasco.nativeElement.click();
    fixture.detectChanges();

    expect(component.motivoSeleccionado()).toBe('ATASCO_PAPEL');

    const btnConfirmar = fixture.debugElement.query(By.css('[data-testid="btn-confirmar-reimpresion"]'));
    expect(btnConfirmar.nativeElement.disabled).toBe(false);
  });

  it('should emit confirmarReimpresion with full reason and trigger double-click guard', () => {
    const emitSpy = vi.spyOn(component.confirmarReimpresion, 'emit');

    component.seleccionarMotivo('FALTA_PAPEL');
    component.observacion.set('Se agotó el papel en caja 2');
    fixture.detectChanges();

    const btnConfirmar = fixture.debugElement.query(By.css('[data-testid="btn-confirmar-reimpresion"]'));
    btnConfirmar.nativeElement.click();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith({
      ticket: mockTicket,
      motivo: 'Falta de papel - Se agotó el papel en caja 2',
      codigoMotivo: 'FALTA_PAPEL'
    });

    // Double-click guard activated
    expect(component.enviando()).toBe(true);
    expect(component.estaProcesando()).toBe(true);
    expect(btnConfirmar.nativeElement.disabled).toBe(true);

    // Showing processing bar
    const indicador = fixture.debugElement.query(By.css('[data-testid="indicador-procesando-reimpresion"]'));
    expect(indicador).toBeTruthy();
  });

  it('should block modal and disable confirm button if ticket is CONSUMIDO (Notion: CA-01, CA-04)', () => {
    component.ticket = {
      ...mockTicket,
      estado: 'CONSUMIDO'
    };
    fixture.detectChanges();

    expect(component.esTicketInvalido()).toBe(true);

    const alerta = fixture.debugElement.query(By.css('[data-testid="alerta-ticket-bloqueado"]'));
    expect(alerta).toBeTruthy();
    expect(alerta.nativeElement.textContent).toContain('HTTP 409');

    const btnConfirmar = fixture.debugElement.query(By.css('[data-testid="btn-confirmar-reimpresion"]'));
    expect(btnConfirmar.nativeElement.disabled).toBe(true);
  });

  it('should emit cancelar when clicking cancel or close buttons', () => {
    const cancelSpy = vi.spyOn(component.cancelar, 'emit');

    const btnCancelar = fixture.debugElement.query(By.css('[data-testid="btn-cancelar-reimpresion"]'));
    btnCancelar.nativeElement.click();
    expect(cancelSpy).toHaveBeenCalledTimes(1);

    const btnCerrar = fixture.debugElement.query(By.css('[data-testid="btn-cerrar-modal-reimpresion"]'));
    btnCerrar.nativeElement.click();
    expect(cancelSpy).toHaveBeenCalledTimes(2);
  });
});
