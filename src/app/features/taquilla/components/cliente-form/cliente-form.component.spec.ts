import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClienteFormComponent } from './cliente-form.component';
import { ClienteService } from '../../../../core/services/cliente.service';
import { Cliente } from '../../../../core/models/cliente.model';
import { of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';

describe('ClienteFormComponent', () => {
  let component: ClienteFormComponent;
  let fixture: ComponentFixture<ClienteFormComponent>;
  let clienteServiceSpy: { buscarPorDocumento: ReturnType<typeof vi.fn> };

  const mockClienteRegistrado: Cliente = {
    idCliente: 15,
    tipoDocumento: 'CC',
    numeroDocumento: '1094900111',
    nombreCompleto: 'Carlos Mendoza',
    telefono: '3104567890',
    correo: 'carlos@ejemplo.com',
    menores: [
      { idMenor: 1, nombreCompleto: 'Juan Mendoza', edad: 6 },
      { idMenor: 2, nombreCompleto: 'Ana Mendoza', edad: 4 }
    ]
  };

  beforeEach(async () => {
    clienteServiceSpy = {
      buscarPorDocumento: vi.fn().mockReturnValue(of(null))
    };

    await TestBed.configureTestingModule({
      imports: [ClienteFormComponent],
      providers: [
        { provide: ClienteService, useValue: clienteServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create with empty form and no minors', () => {
    expect(component).toBeTruthy();
    expect(component.form.valid).toBe(false);
    expect(component.menores().length).toBe(0);
    expect(component.clienteEncontrado()).toBe(false);
  });

  it('should validate required fields (documento, nombre, telefono)', () => {
    const docCtrl = component.form.get('numeroDocumento')!;
    const nameCtrl = component.form.get('nombreCompleto')!;
    const telCtrl = component.form.get('telefono')!;

    expect(docCtrl.valid).toBe(false);
    expect(nameCtrl.valid).toBe(false);
    expect(telCtrl.valid).toBe(false);

    docCtrl.setValue('12345');
    nameCtrl.setValue('Laura');
    telCtrl.setValue('3001234567');

    expect(component.form.valid).toBe(true);
  });

  it('should search for existing client when typing document with debounce', async () => {
    vi.useFakeTimers();
    clienteServiceSpy.buscarPorDocumento.mockReturnValue(of(mockClienteRegistrado));
    let seleccionado: Cliente | undefined;
    component.clienteSeleccionado.subscribe(c => (seleccionado = c));

    component.form.get('numeroDocumento')!.setValue('1094900111');
    vi.advanceTimersByTime(350);
    fixture.detectChanges();

    expect(clienteServiceSpy.buscarPorDocumento).toHaveBeenCalledWith('1094900111');
    expect(component.clienteEncontrado()).toBe(true);
    expect(component.form.get('nombreCompleto')?.value).toBe('Carlos Mendoza');
    expect(component.form.get('telefono')?.value).toBe('3104567890');
    expect(component.menores().length).toBe(2);
    expect(seleccionado).toEqual(mockClienteRegistrado);
    vi.useRealTimers();
  });

  it('should handle client not found gracefully', async () => {
    vi.useFakeTimers();
    clienteServiceSpy.buscarPorDocumento.mockReturnValue(of(null));

    component.form.get('numeroDocumento')!.setValue('99999999');
    vi.advanceTimersByTime(350);
    fixture.detectChanges();

    expect(clienteServiceSpy.buscarPorDocumento).toHaveBeenCalledWith('99999999');
    expect(component.clienteEncontrado()).toBe(false);
    vi.useRealTimers();
  });

  it('should handle service error during document search', async () => {
    vi.useFakeTimers();
    clienteServiceSpy.buscarPorDocumento.mockReturnValue(throwError(() => new Error('Error de red')));

    component.form.get('numeroDocumento')!.setValue('1094900111');
    vi.advanceTimersByTime(350);
    fixture.detectChanges();

    expect(component.buscandoCliente()).toBe(false);
    expect(component.clienteEncontrado()).toBe(false);
    vi.useRealTimers();
  });

  it('should reset form and minors when clicking limpiar()', () => {
    component.cargarCliente(mockClienteRegistrado);
    expect(component.clienteEncontrado()).toBe(true);
    expect(component.menores().length).toBe(2);

    component.limpiar();
    fixture.detectChanges();

    expect(component.form.get('numeroDocumento')?.value).toBe('');
    expect(component.form.get('nombreCompleto')?.value).toBe('');
    expect(component.clienteEncontrado()).toBe(false);
    expect(component.menores().length).toBe(0);
  });

  it('should emit clienteGuardado with form values and associated minors on submit', () => {
    let guardado: Cliente | undefined;
    component.clienteGuardado.subscribe(c => (guardado = c));

    component.form.patchValue({
      numeroDocumento: '1094888777',
      nombreCompleto: 'Camila Rojas',
      telefono: '3157778899',
      correo: 'camila@tdn.com'
    });
    component.menores.set([{ nombreCompleto: 'Samuel Rojas', edad: 7 }]);

    component.guardar();

    expect(guardado).toBeTruthy();
    expect(guardado?.numeroDocumento).toBe('1094888777');
    expect(guardado?.nombreCompleto).toBe('Camila Rojas');
    expect(guardado?.menores?.length).toBe(1);
    expect(guardado?.menores?.[0].nombreCompleto).toBe('Samuel Rojas');
  });

  it('should not emit clienteGuardado if form is invalid', () => {
    let emitted = false;
    component.clienteGuardado.subscribe(() => (emitted = true));

    component.guardar();
    expect(emitted).toBe(false);
  });

  it('should emit cancelar when cancel button is clicked', () => {
    component.mostrarBotonCancelar.set(true);
    fixture.detectChanges();

    let canceled = false;
    component.cancelar.subscribe(() => (canceled = true));

    const cancelBtn = fixture.debugElement.query(By.css('[data-testid="btn-cancelar-cliente"]'));
    expect(cancelBtn).toBeTruthy();
    cancelBtn.nativeElement.click();

    expect(canceled).toBe(true);
  });
});
