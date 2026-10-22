import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaquillaPosComponent } from './pos.component';
import { AuthService } from '../../../../core/services/auth.service';
import { CajaService } from '../../../../core/services/caja.service';
import { ClienteService } from '../../../../core/services/cliente.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ResultadoArqueoDTO, TurnoResponseDTO } from '../../../../core/models/caja.model';
import { Cliente } from '../../../../core/models/cliente.model';
import { By } from '@angular/platform-browser';

describe('TaquillaPosComponent', () => {
  let component: TaquillaPosComponent;
  let fixture: ComponentFixture<TaquillaPosComponent>;
  let authServiceSpy: { currentUser: any; logout: ReturnType<typeof vi.fn> };
  let cajaServiceSpy: {
    obtenerTurnoActivo: ReturnType<typeof vi.fn>;
    abrirTurno: ReturnType<typeof vi.fn>;
    cerrarTurno: ReturnType<typeof vi.fn>;
  };
  let clienteServiceSpy: {
    buscarPorDocumento: ReturnType<typeof vi.fn>;
    registrarCliente: ReturnType<typeof vi.fn>;
    actualizarCliente: ReturnType<typeof vi.fn>;
  };
  let notificationServiceSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  };

  const mockTurno: TurnoResponseDTO = {
    idTurno: 42,
    usuarioId: 7,
    montoInicial: 80000,
    totalRecaudado: 120000,
    fechaApertura: '2026-10-20T08:30:00Z',
    estado: 'ABIERTO'
  };

  const mockCliente: Cliente = {
    idCliente: 15,
    tipoDocumento: 'CC',
    numeroDocumento: '1098765432',
    nombreCompleto: 'María Gómez',
    telefono: '3109876543',
    correo: 'maria.gomez@example.com',
    menores: [
      {
        idMenor: 1,
        nombreCompleto: 'Lucas Gómez',
        edad: 5
      }
    ]
  };

  beforeEach(async () => {
    authServiceSpy = {
      currentUser: signal({ correo: 'taquillero@tdn.com.co', rol: 'TAQUILLERO' }),
      logout: vi.fn()
    };
    cajaServiceSpy = {
      obtenerTurnoActivo: vi.fn().mockReturnValue(of(null)),
      abrirTurno: vi.fn(),
      cerrarTurno: vi.fn()
    };
    clienteServiceSpy = {
      buscarPorDocumento: vi.fn().mockReturnValue(of(null)),
      registrarCliente: vi.fn(),
      actualizarCliente: vi.fn()
    };
    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [TaquillaPosComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CajaService, useValue: cajaServiceSpy },
        { provide: ClienteService, useValue: clienteServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();
  });

  const setupComponent = async (turnoResult: TurnoResponseDTO | null = null, shouldError = false) => {
    if (shouldError) {
      cajaServiceSpy.obtenerTurnoActivo.mockReturnValue(throwError(() => new Error('Error')));
    } else {
      cajaServiceSpy.obtenerTurnoActivo.mockReturnValue(of(turnoResult));
    }

    fixture = TestBed.createComponent(TaquillaPosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('should automatically display AperturaCajaModalComponent when active turno is null', async () => {
    await setupComponent(null);

    expect(component).toBeTruthy();
    expect(component.mostrarModalApertura()).toBe(true);

    const modal = fixture.debugElement.query(By.css('app-apertura-caja-modal'));
    expect(modal).toBeTruthy();
  });

  it('should automatically display AperturaCajaModalComponent when API call fails', async () => {
    await setupComponent(null, true);

    expect(component.mostrarModalApertura()).toBe(true);
    const modal = fixture.debugElement.query(By.css('app-apertura-caja-modal'));
    expect(modal).toBeTruthy();
  });

  it('should not display modal if active shift is ABIERTO and compute expected cash', async () => {
    await setupComponent(mockTurno);

    expect(component.mostrarModalApertura()).toBe(false);
    expect(component.turnoActual()).toEqual(mockTurno);
    expect(component.montoEsperadoArqueo()).toBe(200000); // 80000 + 120000

    const modal = fixture.debugElement.query(By.css('app-apertura-caja-modal'));
    expect(modal).toBeFalsy();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Turno #42');
  });

  it('should hide modal and update turnoActual when onTurnoIniciado is called', async () => {
    await setupComponent(null);
    expect(component.mostrarModalApertura()).toBe(true);

    component.onTurnoIniciado(mockTurno);
    fixture.detectChanges();

    expect(component.mostrarModalApertura()).toBe(false);
    expect(component.turnoActual()).toEqual(mockTurno);

    const modal = fixture.debugElement.query(By.css('app-apertura-caja-modal'));
    expect(modal).toBeFalsy();
  });

  it('should display arqueo modal when clicking "Arqueo / Cerrar Caja"', async () => {
    await setupComponent(mockTurno);

    expect(component.mostrarModalArqueo()).toBe(false);
    component.iniciarArqueo();
    fixture.detectChanges();

    expect(component.mostrarModalArqueo()).toBe(true);
    const arqueoModal = fixture.debugElement.query(By.css('app-arqueo-caja-modal'));
    expect(arqueoModal).toBeTruthy();
  });

  it('should close arqueo modal when cancel is triggered', async () => {
    await setupComponent(mockTurno);
    component.iniciarArqueo();
    fixture.detectChanges();

    expect(component.mostrarModalArqueo()).toBe(true);

    const arqueoModal = fixture.debugElement.query(By.css('app-arqueo-caja-modal'));
    arqueoModal.triggerEventHandler('cancelar', null);
    fixture.detectChanges();

    expect(component.mostrarModalArqueo()).toBe(false);
  });

  it('should process arqueo confirmation, close shift, and show apertura modal', async () => {
    await setupComponent(mockTurno);
    cajaServiceSpy.cerrarTurno.mockReturnValue(of({ ...mockTurno, estado: 'CERRADO' }));

    component.iniciarArqueo();
    fixture.detectChanges();

    const mockResultadoArqueo: ResultadoArqueoDTO = {
      idTurno: 42,
      montoEsperado: 200000,
      totalFisico: 200000,
      diferencia: 0,
      estadoBalance: 'CUADRADO',
      desglose: []
    };

    component.onArqueoConfirmado(mockResultadoArqueo);

    expect(cajaServiceSpy.cerrarTurno).toHaveBeenCalledWith({
      idTurno: 42,
      montoFinal: 200000,
      totalEfectivoReal: 200000,
      observaciones: undefined,
      diferencia: 0,
      justificacion: undefined
    });
    expect(component.mostrarModalArqueo()).toBe(false);
    expect(component.turnoActual()).toBeNull();
    expect(component.mostrarModalApertura()).toBe(true);
    expect(notificationServiceSpy.success).toHaveBeenCalled();
  });

  it('should handle error when closing shift with arqueo', async () => {
    await setupComponent(mockTurno);
    cajaServiceSpy.cerrarTurno.mockReturnValue(throwError(() => ({
      error: { mensaje: 'Error de prueba al cerrar caja' }
    })));

    const mockResultadoArqueo: ResultadoArqueoDTO = {
      idTurno: 42,
      montoEsperado: 200000,
      totalFisico: 180000,
      diferencia: -20000,
      estadoBalance: 'FALTANTE',
      justificacion: 'Faltante justificado de 20k',
      desglose: []
    };

    component.onArqueoConfirmado(mockResultadoArqueo);

    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Error de prueba al cerrar caja');
    expect(component.turnoActual()).not.toBeNull();
  });

  it('should call logout on button click', async () => {
    await setupComponent(mockTurno);
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  describe('Búsqueda y Formulario Reactivo de Cliente', () => {
    it('should not search when document length is less than 5 characters', async () => {
      vi.useFakeTimers();
      await setupComponent(mockTurno);
      clienteServiceSpy.buscarPorDocumento.mockClear();

      component.clienteForm.get('numeroDocumento')!.setValue('1234');
      vi.advanceTimersByTime(400);

      expect(clienteServiceSpy.buscarPorDocumento).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should debounce search by 300ms for valid document numbers', async () => {
      vi.useFakeTimers();
      await setupComponent(mockTurno);
      clienteServiceSpy.buscarPorDocumento.mockClear();
      clienteServiceSpy.buscarPorDocumento.mockReturnValue(of(mockCliente));

      component.clienteForm.get('numeroDocumento')!.setValue('1098765432');

      // Before debounce completes (e.g. 200ms)
      vi.advanceTimersByTime(200);
      expect(clienteServiceSpy.buscarPorDocumento).not.toHaveBeenCalled();

      // After debounce completes (another 150ms => total 350ms)
      vi.advanceTimersByTime(150);
      expect(clienteServiceSpy.buscarPorDocumento).toHaveBeenCalledWith('1098765432');
      vi.useRealTimers();
    });

    it('should autocomplete client data and display Cliente Registrado badge when client is found', async () => {
      vi.useFakeTimers();
      await setupComponent(mockTurno);
      clienteServiceSpy.buscarPorDocumento.mockReturnValue(of(mockCliente));

      component.clienteForm.get('numeroDocumento')!.setValue('1098765432');
      vi.advanceTimersByTime(350);
      fixture.detectChanges();

      expect(component.clienteSeleccionado()).toEqual(mockCliente);
      expect(component.esClienteNuevo()).toBe(false);
      expect(component.clienteForm.get('nombreCompleto')?.value).toBe('María Gómez');
      expect(component.clienteForm.get('telefono')?.value).toBe('3109876543');
      expect(component.clienteForm.get('correo')?.value).toBe('maria.gomez@example.com');

      const badgeRegistrado = fixture.debugElement.query(By.css('[data-testid="badge-cliente-registrado"]'));
      expect(badgeRegistrado).toBeTruthy();
      expect(badgeRegistrado.nativeElement.textContent).toContain('Cliente Registrado');
      vi.useRealTimers();
    });

    it('should set esClienteNuevo to true and clear inputs when client is not found (404/null)', async () => {
      vi.useFakeTimers();
      await setupComponent(mockTurno);
      clienteServiceSpy.buscarPorDocumento.mockReturnValue(of(null));

      // Pre-set values in form to verify clearing
      component.clienteForm.patchValue({
        nombreCompleto: 'Nombre Previo',
        telefono: '3000000000',
        correo: 'previo@test.com'
      });

      component.clienteForm.get('numeroDocumento')!.setValue('99999999');
      vi.advanceTimersByTime(350);
      fixture.detectChanges();

      expect(component.clienteSeleccionado()).toBeNull();
      expect(component.esClienteNuevo()).toBe(true);
      expect(component.clienteForm.get('nombreCompleto')?.value).toBe('');
      expect(component.clienteForm.get('telefono')?.value).toBe('');
      expect(component.clienteForm.get('correo')?.value).toBe('');

      const badgeNuevo = fixture.debugElement.query(By.css('[data-testid="badge-nuevo-cliente"]'));
      expect(badgeNuevo).toBeTruthy();
      expect(badgeNuevo.nativeElement.textContent).toContain('Nuevo Cliente');
      vi.useRealTimers();
    });

    it('should reset client form and signals when limpiarCliente is called', async () => {
      vi.useFakeTimers();
      await setupComponent(mockTurno);
      clienteServiceSpy.buscarPorDocumento.mockReturnValue(of(mockCliente));

      component.clienteForm.get('numeroDocumento')!.setValue('1098765432');
      vi.advanceTimersByTime(350);
      fixture.detectChanges();

      expect(component.clienteSeleccionado()).toBeTruthy();

      component.limpiarCliente();
      fixture.detectChanges();

      expect(component.clienteSeleccionado()).toBeNull();
      expect(component.esClienteNuevo()).toBe(false);
      expect(component.buscandoCliente()).toBe(false);
      expect(component.clienteForm.get('numeroDocumento')?.value).toBe('');
      expect(component.clienteForm.get('nombreCompleto')?.value).toBe('');
      expect(component.clienteForm.get('telefono')?.value).toBe('');
      expect(component.clienteForm.get('correo')?.value).toBe('');
      vi.useRealTimers();
    });

    it('should call limpiarCliente when clicking Limpiar button', async () => {
      await setupComponent(mockTurno);
      const limpiarSpy = vi.spyOn(component, 'limpiarCliente');

      const btnLimpiar = fixture.debugElement.query(By.css('[data-testid="btn-limpiar"]'));
      expect(btnLimpiar).toBeTruthy();
      btnLimpiar.nativeElement.click();

      expect(limpiarSpy).toHaveBeenCalled();
    });
  });
});
