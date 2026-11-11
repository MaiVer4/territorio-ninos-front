import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TaquillaPosComponent } from './pos.component';
import { AuthService } from '../../../../core/services/auth.service';
import { CajaService } from '../../../../core/services/caja.service';
import { ClienteService } from '../../../../core/services/cliente.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ResultadoArqueoDTO, TurnoResponseDTO } from '../../../../core/models/caja.model';
import { Cliente } from '../../../../core/models/cliente.model';
import { Atraccion, ResumenLiquidacionPOS, SeleccionCatalogoPOS } from '../../../../core/models/atraccion.model';
import { Ticket } from '../../../../core/models/ticket.model';
import { By } from '@angular/platform-browser';

describe('TaquillaPosComponent', () => {
  let component: TaquillaPosComponent;
  let fixture: ComponentFixture<TaquillaPosComponent>;
  let authServiceSpy: {
    currentUser: any;
    currentUserName: any;
    currentUserInitials: any;
    logout: ReturnType<typeof vi.fn>;
  };
  let cajaServiceSpy: {
    obtenerTurnoActivo: ReturnType<typeof vi.fn>;
    abrirTurno: ReturnType<typeof vi.fn>;
    cerrarTurno: ReturnType<typeof vi.fn>;
    registrarArqueo: ReturnType<typeof vi.fn>;
  };
  let clienteServiceSpy: {
    buscarPorDocumento: ReturnType<typeof vi.fn>;
    registrarCliente: ReturnType<typeof vi.fn>;
    actualizarCliente: ReturnType<typeof vi.fn>;
  };
  let atraccionServiceSpy: {
    getAll: ReturnType<typeof vi.fn>;
  };
  let notificationServiceSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  const mockAtraccion1: Atraccion = {
    id: 1,
    nombre: 'Inflable Gigante',
    tipo: 'TEMPORIZADA',
    estado: 'ACTIVO',
    tarifaMinuto: 600,
    precio: 9000,
    capacidadMaxima: 15,
    ninosActivos: 5,
    duracionMinutosBase: 15
  };

  const mockAtraccion2: Atraccion = {
    id: 2,
    nombre: 'Toro Mecánico',
    tipo: 'EVENTOS_CAIDAS',
    estado: 'ACTIVO',
    tarifaMinuto: 10000,
    precio: 10000,
    capacidadMaxima: 5,
    ninosActivos: 1,
    duracionMinutosBase: 0,
    caidasLimite: 3
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
      currentUserName: signal('Taquillero Principal'),
      currentUserInitials: signal('TP'),
      logout: vi.fn()
    };
    cajaServiceSpy = {
      obtenerTurnoActivo: vi.fn().mockReturnValue(of(null)),
      abrirTurno: vi.fn(),
      cerrarTurno: vi.fn(),
      registrarArqueo: vi.fn().mockReturnValue(of({}))
    };
    clienteServiceSpy = {
      buscarPorDocumento: vi.fn().mockReturnValue(of(null)),
      registrarCliente: vi.fn(),
      actualizarCliente: vi.fn()
    };
    atraccionServiceSpy = {
      getAll: vi.fn().mockReturnValue(of([mockAtraccion1, mockAtraccion2]))
    };
    notificationServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    };

    vi.spyOn(window, 'print').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [TaquillaPosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CajaService, useValue: cajaServiceSpy },
        { provide: ClienteService, useValue: clienteServiceSpy },
        { provide: AtraccionService, useValue: atraccionServiceSpy },
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

    expect(cajaServiceSpy.registrarArqueo).toHaveBeenCalledWith(42, mockResultadoArqueo);
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

  it('should render user name and initials in bottom dock and station status', async () => {
    await setupComponent(mockTurno);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Taquillero Principal');
    expect(compiled.textContent).toContain('TP');
    expect(compiled.textContent).toContain('Taquillero');
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

    it('should reset client form, minors list, and signals when limpiarCliente is called', async () => {
      vi.useFakeTimers();
      await setupComponent(mockTurno);
      clienteServiceSpy.buscarPorDocumento.mockReturnValue(of(mockCliente));

      component.clienteForm.get('numeroDocumento')!.setValue('1098765432');
      vi.advanceTimersByTime(350);
      fixture.detectChanges();

      expect(component.clienteSeleccionado()).toBeTruthy();
      expect(component.menoresOrden().length).toBe(1);

      component.limpiarCliente();
      fixture.detectChanges();

      expect(component.clienteSeleccionado()).toBeNull();
      expect(component.esClienteNuevo()).toBe(false);
      expect(component.buscandoCliente()).toBe(false);
      expect(component.menoresOrden()).toEqual([]);
      expect(component.clienteForm.get('numeroDocumento')?.value).toBe('');
      expect(component.clienteForm.get('nombreCompleto')?.value).toBe('');
      expect(component.clienteForm.get('telefono')?.value).toBe('');
      expect(component.clienteForm.get('correo')?.value).toBe('');
      vi.useRealTimers();
    });

    it('should synchronize minors into menoresOrden when client is found', async () => {
      vi.useFakeTimers();
      await setupComponent(mockTurno);
      clienteServiceSpy.buscarPorDocumento.mockReturnValue(of(mockCliente));

      component.clienteForm.get('numeroDocumento')!.setValue('1098765432');
      vi.advanceTimersByTime(350);
      fixture.detectChanges();

      expect(component.menoresOrden()).toEqual(mockCliente.menores!);
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

  describe('Atajos de Teclado (HU-15.12)', () => {
    it('should trigger F2 shortcut to focus document input and notify', async () => {
      await setupComponent(mockTurno);
      const enfocarSpy = vi.spyOn(component, 'enfocarBuscarCliente');

      const event = new KeyboardEvent('keydown', { key: 'F2', cancelable: true });
      window.dispatchEvent(event);
      fixture.detectChanges();

      expect(enfocarSpy).toHaveBeenCalled();
      expect(notificationServiceSpy.info).toHaveBeenCalledWith('Atajo F2: Campo de documento de cliente enfocado.');
    });

    it('should trigger F4 shortcut to open caja modal when caja is closed', async () => {
      await setupComponent(null);
      // Close modal first to test re-opening with F4
      component.mostrarModalApertura.set(false);
      fixture.detectChanges();

      const event = new KeyboardEvent('keydown', { key: 'F4', cancelable: true });
      window.dispatchEvent(event);
      fixture.detectChanges();

      expect(component.mostrarModalApertura()).toBe(true);
    });

    it('should trigger F4 shortcut and show info notification if caja is already open', async () => {
      await setupComponent(mockTurno);

      const event = new KeyboardEvent('keydown', { key: 'F4', cancelable: true });
      window.dispatchEvent(event);
      fixture.detectChanges();

      expect(notificationServiceSpy.info).toHaveBeenCalledWith('El turno de caja actual ya se encuentra abierto.');
    });

    it('should trigger F8 shortcut to launch arqueo modal when caja is open', async () => {
      await setupComponent(mockTurno);
      const arqueoSpy = vi.spyOn(component, 'iniciarArqueo');

      const event = new KeyboardEvent('keydown', { key: 'F8', cancelable: true });
      window.dispatchEvent(event);
      fixture.detectChanges();

      expect(arqueoSpy).toHaveBeenCalled();
      expect(component.mostrarModalArqueo()).toBe(true);
    });

    it('should trigger F8 shortcut and show warn notification if caja is closed', async () => {
      await setupComponent(null);
      component.mostrarModalApertura.set(false);
      fixture.detectChanges();

      const event = new KeyboardEvent('keydown', { key: 'F8', cancelable: true });
      window.dispatchEvent(event);
      fixture.detectChanges();

      expect(notificationServiceSpy.warn).toHaveBeenCalledWith('Debe tener un turno de caja abierto para realizar el arqueo.');
    });

    it('should trigger shortcut methods when clicking header shortcut badges', async () => {
      await setupComponent(mockTurno);
      const enfocarSpy = vi.spyOn(component, 'enfocarBuscarCliente');
      const arqueoSpy = vi.spyOn(component, 'arqueoCajaShortcut');

      const badgeF2 = fixture.debugElement.query(By.css('[data-testid="shortcut-badge-f2"]'));
      expect(badgeF2).toBeTruthy();
      badgeF2.nativeElement.click();
      expect(enfocarSpy).toHaveBeenCalled();

      const badgeF8 = fixture.debugElement.query(By.css('[data-testid="shortcut-badge-f8"]'));
      expect(badgeF8).toBeTruthy();
      badgeF8.nativeElement.click();
      expect(arqueoSpy).toHaveBeenCalled();
    });

    it('should ignore keyboard shortcuts when a blocking modal is open', async () => {
      await setupComponent(mockTurno);
      component.mostrarModalArqueo.set(true);
      const enfocarSpy = vi.spyOn(component, 'enfocarBuscarCliente');

      const event = new KeyboardEvent('keydown', { key: 'F2', cancelable: true });
      window.dispatchEvent(event);
      fixture.detectChanges();

      expect(enfocarSpy).not.toHaveBeenCalled();

      // Also verify when confirmar pago modal is active
      component.mostrarModalArqueo.set(false);
      component.mostrarModalConfirmarPago.set(true);
      fixture.detectChanges();

      window.dispatchEvent(event);
      fixture.detectChanges();

      expect(enfocarSpy).not.toHaveBeenCalled();
    });
  });

  describe('Catálogo de Atracciones y Pre-Orden (CA-01)', () => {
    it('should load and display attractions from AtraccionService on init', async () => {
      await setupComponent(mockTurno);
      expect(atraccionServiceSpy.getAll).toHaveBeenCalled();
      expect(component.atracciones().length).toBe(2);

      const catalogoComponent = fixture.debugElement.query(By.css('app-catalogo-atracciones'));
      expect(catalogoComponent).toBeTruthy();
    });

    it('should add selected attraction and modality to itemsSeleccionados and calculate total', async () => {
      await setupComponent(mockTurno);

      const seleccion: SeleccionCatalogoPOS = {
        atraccion: mockAtraccion1,
        modalidad: {
          tipo: 'TEMPORIZADA',
          etiqueta: '15 min',
          valor: 15,
          precio: 9000
        }
      };

      component.onAtraccionSeleccionada(seleccion);
      fixture.detectChanges();

      expect(component.itemsSeleccionados().length).toBe(1);
      expect(component.totalOrden()).toBe(9000);
      expect(notificationServiceSpy.success).toHaveBeenCalledWith(
        expect.stringContaining('Inflable Gigante')
      );

      const totalEl = fixture.debugElement.query(By.css('[data-testid="total-orden"]'));
      expect(totalEl.nativeElement.textContent).toContain('$9.000');
    });

    it('should remove item from order when clicking remove button', async () => {
      await setupComponent(mockTurno);

      component.itemsSeleccionados.set([
        {
          atraccion: mockAtraccion1,
          modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 }
        },
        {
          atraccion: mockAtraccion2,
          modalidad: { tipo: 'EVENTOS_CAIDAS', etiqueta: '3 caídas', valor: 3, precio: 10000 }
        }
      ]);
      fixture.detectChanges();

      expect(component.itemsSeleccionados().length).toBe(2);
      expect(component.totalOrden()).toBe(19000);

      const btnQuitar = fixture.debugElement.query(By.css('[data-testid="btn-quitar-item-0"]'));
      expect(btnQuitar).toBeTruthy();
      btnQuitar.nativeElement.click();
      fixture.detectChanges();

      expect(component.itemsSeleccionados().length).toBe(1);
      expect(component.itemsSeleccionados()[0].atraccion.id).toBe(2);
      expect(component.totalOrden()).toBe(10000);
    });

    it('should clear all items in order when clicking Vaciar', async () => {
      await setupComponent(mockTurno);

      component.itemsSeleccionados.set([
        {
          atraccion: mockAtraccion1,
          modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 }
        }
      ]);
      fixture.detectChanges();

      const btnVaciar = fixture.debugElement.query(By.css('[data-testid="btn-limpiar-orden"]'));
      expect(btnVaciar).toBeTruthy();
      btnVaciar.nativeElement.click();
      fixture.detectChanges();

      expect(component.itemsSeleccionados().length).toBe(0);
      expect(component.totalOrden()).toBe(0);

      const vaciaMsg = fixture.debugElement.query(By.css('[data-testid="orden-vacia"]'));
      expect(vaciaMsg).toBeTruthy();
    });

    it('should preassign minor automatically if only one minor is present in order', async () => {
      await setupComponent(mockTurno);
      component.menoresOrden.set([{ idMenor: 99, nombreCompleto: 'Mateo', edad: 4 }]);

      const seleccion: SeleccionCatalogoPOS = {
        atraccion: mockAtraccion1,
        modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 }
      };

      component.onAtraccionSeleccionada(seleccion);
      fixture.detectChanges();

      expect(component.itemsSeleccionados().length).toBe(1);
      expect(component.itemsSeleccionados()[0].menorAsignado?.nombreCompleto).toBe('Mateo');
      expect(component.itemsSeleccionados()[0].cantidad).toBe(1);
    });

    it('should increment item quantity in cart and recalculate totalOrden', async () => {
      await setupComponent(mockTurno);

      component.itemsSeleccionados.set([
        {
          atraccion: mockAtraccion1,
          modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 },
          cantidad: 1
        }
      ]);
      fixture.detectChanges();

      const btnInc = fixture.debugElement.query(By.css('[data-testid="btn-incrementar-0"]'));
      btnInc.nativeElement.click();
      fixture.detectChanges();

      expect(component.itemsSeleccionados()[0].cantidad).toBe(2);
      expect(component.totalOrden()).toBe(18000);
    });

    it('should update assigned minor through cart dropdown', async () => {
      await setupComponent(mockTurno);
      component.menoresOrden.set([
        { idMenor: 1, nombreCompleto: 'Lucas Gómez', edad: 5 },
        { idMenor: 2, nombreCompleto: 'Sofía Gómez', edad: 8 }
      ]);
      component.itemsSeleccionados.set([
        {
          atraccion: mockAtraccion1,
          modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 },
          cantidad: 1,
          menorAsignado: null
        }
      ]);
      fixture.detectChanges();

      const selectMenor = fixture.debugElement.query(By.css('[data-testid="select-menor-0"]'));
      selectMenor.nativeElement.value = '2';
      selectMenor.nativeElement.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(component.itemsSeleccionados()[0].menorAsignado?.nombreCompleto).toBe('Sofía Gómez');
    });

    it('should handle error when loading attractions catalogue fails', async () => {
      atraccionServiceSpy.getAll.mockReturnValue(throwError(() => new Error('Error al cargar')));
      await setupComponent(mockTurno);

      expect(component.atracciones()).toEqual([]);
      expect(notificationServiceSpy.error).toHaveBeenCalledWith('Error al cargar el catálogo de atracciones.');
    });

    it('should open ConfirmarPagoModal when liquidarOrden is triggered from PosCartComponent', async () => {
      await setupComponent(mockTurno);

      component.itemsSeleccionados.set([
        {
          atraccion: mockAtraccion1,
          modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 },
          cantidad: 1
        }
      ]);
      fixture.detectChanges();

      const resumen: ResumenLiquidacionPOS = {
        items: component.itemsSeleccionados(),
        totalBoletas: 1,
        subtotal: 7563,
        porcentajeIva: 19,
        impuestos: 1437,
        granTotal: 9000,
        metodoPago: 'EFECTIVO',
        montoRecibido: 10000,
        cambio: 1000
      };

      component.onLiquidarOrden(resumen);
      fixture.detectChanges();

      expect(component.mostrarModalConfirmarPago()).toBe(true);
      expect(component.resumenPendientePago()).toEqual(resumen);

      const modalEl = fixture.debugElement.query(By.css('app-confirmar-pago-modal'));
      expect(modalEl).toBeTruthy();
    });

    it('should complete sale, notify success, and clear itemsSeleccionados when onPagoConfirmado is called', async () => {
      await setupComponent(mockTurno);

      component.itemsSeleccionados.set([
        {
          atraccion: mockAtraccion1,
          modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 },
          cantidad: 1
        }
      ]);
      component.mostrarModalConfirmarPago.set(true);
      fixture.detectChanges();

      const resumen: ResumenLiquidacionPOS = {
        items: component.itemsSeleccionados(),
        totalBoletas: 1,
        subtotal: 7563,
        porcentajeIva: 19,
        impuestos: 1437,
        granTotal: 9000,
        metodoPago: 'EFECTIVO',
        montoRecibido: 10000,
        cambio: 1000
      };

      component.onPagoConfirmado(resumen);
      fixture.detectChanges();

      expect(component.itemsSeleccionados().length).toBe(0);
      expect(component.mostrarModalConfirmarPago()).toBe(false);
      expect(component.resumenPendientePago()).toBeNull();
      expect(component.boletasGeneradas().length).toBe(1);
      expect(component.boletasGeneradas()[0].codigoBoleta).toContain('TDN-');
      expect(component.boletasGeneradas()[0].atraccionNombre).toBe('Inflable Gigante');
      expect(notificationServiceSpy.success).toHaveBeenCalledWith(
        expect.stringContaining('Orden liquidada exitosamente')
      );
    });

    it('[SCRUM-368] HU-19.09: should map generated tickets into application state on payment confirmation', async () => {
      await setupComponent(mockTurno);
      component.colaEmisionService.limpiarTodo();

      component.clienteForm.patchValue({
        numeroDocumento: '1094888999',
        nombreCompleto: 'María Cardona',
        telefono: '3109998888',
        correo: 'maria@ejemplo.com'
      });

      const resumen: ResumenLiquidacionPOS = {
        items: [
          {
            atraccion: mockAtraccion1,
            modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 },
            cantidad: 2,
            menorAsignado: { idMenor: 5, nombreCompleto: 'Sofía', edad: 6 }
          }
        ],
        totalBoletas: 2,
        subtotal: 15126,
        porcentajeIva: 19,
        impuestos: 2874,
        granTotal: 18000,
        metodoPago: 'EFECTIVO',
        montoRecibido: 20000,
        cambio: 2000
      };

      component.onPagoConfirmado(resumen);
      fixture.detectChanges();

      // Verificar que el estado reactivo expone las boletas generadas
      const boletas = component.boletasGeneradas();
      expect(boletas.length).toBe(2);
      expect(boletas[0].clienteNombre).toBe('María Cardona');
      expect(boletas[0].clienteDocumento).toBe('1094888999');
      expect(boletas[0].menorNombre).toBe('Sofía');
      expect(boletas[0].atraccionNombre).toBe('Inflable Gigante');
      expect(boletas[0].codigoBoleta).toContain('TDN-1-');
      expect(boletas[0].uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(boletas[0].codigoQr).toBe(boletas[0].uuid);
      expect(boletas[0].estado).toBe('PENDIENTE');

      // Verificar que se renderizan en el panel de emisión física
      const itemTicket0 = fixture.debugElement.query(By.css('[data-testid="ticket-generado-0"]'));
      expect(itemTicket0).toBeTruthy();
      expect(itemTicket0.nativeElement.textContent).toContain('Inflable Gigante');
      expect(itemTicket0.nativeElement.textContent).toContain('Sofía');
      expect(itemTicket0.nativeElement.textContent).toContain(boletas[0].codigoBoleta);
    });

    it('[SCRUM-373] HU-20.07: should render QR carousel for pending orders and navigate tickets prior to emission', async () => {
      await setupComponent(mockTurno);
      component.colaEmisionService.limpiarTodo();

      const resumen: ResumenLiquidacionPOS = {
        items: [
          {
            atraccion: mockAtraccion1,
            modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 },
            cantidad: 2,
            menorAsignado: { idMenor: 1, nombreCompleto: 'Lucas', edad: 5 }
          }
        ],
        totalBoletas: 2,
        subtotal: 15126,
        porcentajeIva: 19,
        impuestos: 2874,
        granTotal: 18000,
        metodoPago: 'EFECTIVO',
        montoRecibido: 20000,
        cambio: 2000
      };

      component.onPagoConfirmado(resumen);
      fixture.detectChanges();

      const orden = component.colaEmisionService.ordenReciente()!;
      expect(orden).toBeTruthy();
      expect(orden.boletas.length).toBe(2);

      // Carousel element rendered
      const carrusel = fixture.debugElement.query(By.css(`[data-testid="carrusel-qr-orden-${orden.idOrden}"]`));
      expect(carrusel).toBeTruthy();

      // Counter should show Boleta 1 de 2
      const contador = fixture.debugElement.query(By.css('[data-testid="carrusel-contador-boletas"]'));
      expect(contador.nativeElement.textContent).toContain('Boleta 1 de 2');

      // QrViewer component rendered inside carousel
      const qrViewer = fixture.debugElement.query(By.css('app-qr-viewer'));
      expect(qrViewer).toBeTruthy();

      // Navigation: Click next button
      const btnNext = fixture.debugElement.query(By.css('[data-testid="btn-carrusel-next"]'));
      btnNext.nativeElement.click();
      fixture.detectChanges();

      expect(component.obtenerIndiceCarrusel(orden.idOrden, 2)).toBe(1);
      expect(contador.nativeElement.textContent).toContain('Boleta 2 de 2');

      // Navigation via dot
      const dot0 = fixture.debugElement.query(By.css('[data-testid="btn-carrusel-dot-0"]'));
      dot0.nativeElement.click();
      fixture.detectChanges();

      expect(component.obtenerIndiceCarrusel(orden.idOrden, 2)).toBe(0);
      expect(contador.nativeElement.textContent).toContain('Boleta 1 de 2');

      // Navigation by clicking on second ticket row in summary list
      const ticketRow1 = fixture.debugElement.query(By.css('[data-testid="ticket-generado-1"]'));
      ticketRow1.nativeElement.click();
      fixture.detectChanges();

      expect(component.obtenerIndiceCarrusel(orden.idOrden, 2)).toBe(1);
      expect(contador.nativeElement.textContent).toContain('Boleta 2 de 2');
    });

    it('should close modal and retain items in order when onCancelarConfirmacionPago is called', async () => {
      await setupComponent(mockTurno);

      component.itemsSeleccionados.set([
        {
          atraccion: mockAtraccion1,
          modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 },
          cantidad: 1
        }
      ]);
      component.mostrarModalConfirmarPago.set(true);
      fixture.detectChanges();

      component.onCancelarConfirmacionPago();
      fixture.detectChanges();

      expect(component.mostrarModalConfirmarPago()).toBe(false);
      expect(component.resumenPendientePago()).toBeNull();
      expect(component.itemsSeleccionados().length).toBe(1);
    });

    it('should warn and not add attraction when aggregate quantity in cart reaches capacity', async () => {
      await setupComponent(mockTurno);
      // mockAtraccion2 has cap=5, ninosActivos=1 => 4 available spots
      component.itemsSeleccionados.set([
        {
          atraccion: mockAtraccion2,
          modalidad: { tipo: 'EVENTOS_CAIDAS', etiqueta: '3 caídas', valor: 3, precio: 10000 },
          cantidad: 4
        }
      ]);

      const selectionToAdd: SeleccionCatalogoPOS = {
        atraccion: mockAtraccion2,
        modalidad: { tipo: 'EVENTOS_CAIDAS', etiqueta: '5 caídas', valor: 5, precio: 15000 },
        cantidad: 1
      };

      component.onAtraccionSeleccionada(selectionToAdd);

      expect(component.itemsSeleccionados().length).toBe(1);
      expect(notificationServiceSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('No quedan más cupos disponibles')
      );
    });

    it('should clean menorAsignado from cart items when the child is removed from menoresOrden', async () => {
      await setupComponent(mockTurno);
      const child1 = { idMenor: 101, nombreCompleto: 'Santi Pérez', edad: 4 };
      const child2 = { idMenor: 102, nombreCompleto: 'Valentina Pérez', edad: 7 };

      component.menoresOrden.set([child1, child2]);
      component.itemsSeleccionados.set([
        {
          atraccion: mockAtraccion1,
          modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 },
          cantidad: 1,
          menorAsignado: child1
        },
        {
          atraccion: mockAtraccion2,
          modalidad: { tipo: 'EVENTOS_CAIDAS', etiqueta: '3 caídas', valor: 3, precio: 10000 },
          cantidad: 1,
          menorAsignado: child2
        }
      ]);

      // Remove child1, keeping only child2
      component.onMenoresOrdenChange([child2]);

      expect(component.menoresOrden().length).toBe(1);
      expect(component.itemsSeleccionados()[0].menorAsignado).toBeNull();
      expect(component.itemsSeleccionados()[1].menorAsignado).toEqual(child2);
    });

    it('should reset customer form and menoresOrden after payment confirmation and clear emission queue on shift close', async () => {
      await setupComponent(mockTurno);
      component.clienteForm.patchValue({
        numeroDocumento: '12345678',
        nombreCompleto: 'Carlos Ruiz',
        telefono: '3001112233'
      });
      component.menoresOrden.set([{ idMenor: 1, nombreCompleto: 'Leo Ruiz', edad: 5 }]);

      const resumen: ResumenLiquidacionPOS = {
        items: [
          {
            atraccion: mockAtraccion1,
            modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 },
            cantidad: 1
          }
        ],
        totalBoletas: 1,
        subtotal: 7563,
        porcentajeIva: 19,
        impuestos: 1437,
        granTotal: 9000,
        metodoPago: 'EFECTIVO',
        montoRecibido: 10000,
        cambio: 1000
      };

      component.onPagoConfirmado(resumen);

      expect(component.clienteForm.get('numeroDocumento')?.value).toBe('');
      expect(component.clienteForm.get('nombreCompleto')?.value).toBe('');
      expect(component.menoresOrden().length).toBe(0);
      expect(component.colaEmisionService.ordenes().length).toBeGreaterThan(0);

      // Now close shift via arqueo
      cajaServiceSpy.cerrarTurno.mockReturnValue(of({ ...mockTurno, estado: 'CERRADO' }));
      component.onArqueoConfirmado({
        idTurno: 42,
        montoEsperado: 159000,
        totalFisico: 159000,
        diferencia: 0,
        estadoBalance: 'CUADRADO',
        justificacion: '',
        desglose: []
      });
      expect(component.colaEmisionService.ordenes().length).toBe(0);
      expect(component.colaEmisionService.historialTicketsTurno().length).toBe(0);
    });
  });

  describe('Impresión Térmica POS (HU-21.05, HU-21.06, HU-21.07)', () => {
    let windowPrintSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      windowPrintSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    });

    afterEach(() => {
      windowPrintSpy.mockRestore();
    });

    it('should automatically trigger printService.imprimirOrden and window.print upon onPagoConfirmado (HU-21.06)', async () => {
      await setupComponent(mockTurno);
      const printSpy = vi.spyOn(component.printService, 'imprimirOrden');

      const resumen: ResumenLiquidacionPOS = {
        items: [
          {
            atraccion: mockAtraccion1,
            modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 },
            cantidad: 1
          }
        ],
        totalBoletas: 1,
        subtotal: 7563,
        porcentajeIva: 19,
        impuestos: 1437,
        granTotal: 9000,
        metodoPago: 'EFECTIVO',
        montoRecibido: 10000,
        cambio: 1000
      };

      component.onPagoConfirmado(resumen);

      expect(printSpy).toHaveBeenCalled();
      const ordenImpresa = printSpy.mock.calls[0][0];
      expect(ordenImpresa.granTotal).toBe(9000);
      expect(ordenImpresa.boletas.length).toBe(1);
      expect(windowPrintSpy).toHaveBeenCalled();
      expect(notificationServiceSpy.success).toHaveBeenCalledWith(
        expect.stringContaining('Orden liquidada exitosamente')
      );
    });

    it('should hide screen UI elements with .no-print and render ticket print template in .only-print container (HU-21.07)', async () => {
      await setupComponent(mockTurno);

      const header = fixture.debugElement.query(By.css('header.no-print'));
      const seccionCliente = fixture.debugElement.query(By.css('section.no-print'));
      const main = fixture.debugElement.query(By.css('main.no-print'));
      const footer = fixture.debugElement.query(By.css('footer.no-print'));

      expect(header).toBeTruthy();
      expect(seccionCliente).toBeTruthy();
      expect(main).toBeTruthy();
      expect(footer).toBeTruthy();

      const printContainer = fixture.debugElement.query(By.css('[data-testid="contenedor-impresion-pos"]'));
      expect(printContainer).toBeTruthy();
      expect(printContainer.nativeElement.classList.contains('only-print')).toBe(true);

      const printTemplate = fixture.debugElement.query(By.css('app-ticket-print-template'));
      expect(printTemplate).toBeTruthy();
    });

    it('should allow manual re-printing of an order from the emission queue', async () => {
      await setupComponent(mockTurno);
      const printSpy = vi.spyOn(component.printService, 'imprimirOrden');

      const resumen: ResumenLiquidacionPOS = {
        items: [
          {
            atraccion: mockAtraccion1,
            modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 },
            cantidad: 1
          }
        ],
        totalBoletas: 1,
        subtotal: 7563,
        porcentajeIva: 19,
        impuestos: 1437,
        granTotal: 9000,
        metodoPago: 'EFECTIVO',
        montoRecibido: 10000,
        cambio: 1000
      };

      const orden = component.colaEmisionService.encolarVenta(resumen, 'Juan Pérez');
      component.mostrarColaEmision.set(true);
      fixture.detectChanges();

      const btnReimprimir = fixture.debugElement.query(By.css(`[data-testid="btn-imprimir-orden-${orden.idOrden}"]`));
      expect(btnReimprimir).toBeTruthy();
      btnReimprimir.nativeElement.click();

      expect(printSpy).toHaveBeenCalledWith(orden);
      expect(windowPrintSpy).toHaveBeenCalled();
      expect(notificationServiceSpy.info).toHaveBeenCalledWith(
        expect.stringContaining(`Enviando orden #${orden.idOrden} a impresión`)
      );
    });

    it('should allow changing thermal paper width between 80mm and 58mm (HU-21.05)', async () => {
      await setupComponent(mockTurno);

      const resumen: ResumenLiquidacionPOS = {
        items: [
          {
            atraccion: mockAtraccion1,
            modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 },
            cantidad: 1
          }
        ],
        totalBoletas: 1,
        subtotal: 7563,
        porcentajeIva: 19,
        impuestos: 1437,
        granTotal: 9000,
        metodoPago: 'EFECTIVO',
        montoRecibido: 10000,
        cambio: 1000
      };

      component.colaEmisionService.encolarVenta(resumen, 'Juan Pérez');
      component.mostrarColaEmision.set(true);
      fixture.detectChanges();

      const btn58 = fixture.debugElement.query(By.css('[data-testid="btn-ancho-58mm"]'));
      const btn80 = fixture.debugElement.query(By.css('[data-testid="btn-ancho-80mm"]'));
      expect(btn58).toBeTruthy();
      expect(btn80).toBeTruthy();

      btn58.nativeElement.click();
      expect(component.printService.anchoPapelMm()).toBe(58);
      expect(notificationServiceSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('58mm')
      );

      btn80.nativeElement.click();
      expect(component.printService.anchoPapelMm()).toBe(80);
      expect(notificationServiceSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('80mm')
      );
    });
  });

  describe('Reimpresión Auditada de Boletas (HU-22.06, HU-22.07, HU-22.08)', () => {
    const mockResumenReimp: ResumenLiquidacionPOS = {
      items: [
        {
          atraccion: mockAtraccion1,
          modalidad: { tipo: 'TEMPORIZADA', etiqueta: '15 min', valor: 15, precio: 9000 },
          cantidad: 1
        }
      ],
      totalBoletas: 1,
      subtotal: 7563,
      porcentajeIva: 19,
      impuestos: 1437,
      granTotal: 9000,
      metodoPago: 'EFECTIVO',
      montoRecibido: 10000,
      cambio: 1000
    };

    it('should display "Reimprimir última boleta" button in header when shift is active and tickets exist (HU-22.07 / SCRUM-383)', async () => {
      await setupComponent(mockTurno);

      // Initially no tickets emitted -> button not visible
      let btnReimp = fixture.debugElement.query(By.css('[data-testid="btn-reimprimir-ultima-boleta"]'));
      expect(btnReimp).toBeNull();

      // Enqueue a sale -> ticket emitted
      component.colaEmisionService.encolarVenta(mockResumenReimp, 'Carlos Rojas');
      fixture.detectChanges();

      btnReimp = fixture.debugElement.query(By.css('[data-testid="btn-reimprimir-ultima-boleta"]'));
      expect(btnReimp).toBeTruthy();
    });

    it('should open ReimpresionModalComponent when clicking "Reimprimir última boleta" button', async () => {
      await setupComponent(mockTurno);
      component.colaEmisionService.encolarVenta(mockResumenReimp, 'Carlos Rojas');
      fixture.detectChanges();

      const btnReimp = fixture.debugElement.query(By.css('[data-testid="btn-reimprimir-ultima-boleta"]'));
      btnReimp.nativeElement.click();
      fixture.detectChanges();

      expect(component.mostrarModalReimpresion()).toBe(true);
      expect(component.ticketPendienteReimpresion()).toBeTruthy();
      expect(component.ticketPendienteReimpresion()?.atraccionNombre).toBe('Inflable Gigante');

      const modalEl = fixture.debugElement.query(By.css('app-reimpresion-modal'));
      expect(modalEl).toBeTruthy();
    });

    it('should process confirmed re-print: invoke ticketReimpresionService, print single ticket with ** REIMPRESIÓN ** and notify with toast (HU-22.08 / SCRUM-384)', async () => {
      await setupComponent(mockTurno);
      const orden = component.colaEmisionService.encolarVenta(mockResumenReimp, 'Carlos Rojas');
      const ticketObjetivo = orden.boletas[0];

      const reimpServiceSpy = vi.spyOn(component.ticketReimpresionService, 'solicitarReimpresion').mockReturnValue(of({
        idLog: 'LOG-999',
        ticketUuid: ticketObjetivo.uuid!,
        codigoBoleta: ticketObjetivo.codigoBoleta,
        motivo: 'Atasco de papel',
        marcaImpresion: '** REIMPRESIÓN **',
        fechaReimpresion: '2026-11-02T19:30:00Z'
      }));

      const printBoletasSpy = vi.spyOn(component.printService, 'imprimirBoletas');

      component.abrirModalReimpresionBoleta(ticketObjetivo);
      expect(component.mostrarModalReimpresion()).toBe(true);

      component.onConfirmarReimpresion({
        ticket: ticketObjetivo,
        motivo: 'Atasco de papel',
        codigoMotivo: 'ATASCO_PAPEL'
      });
      fixture.detectChanges();

      expect(reimpServiceSpy).toHaveBeenCalledWith(ticketObjetivo, { motivo: 'Atasco de papel' });
      expect(printBoletasSpy).toHaveBeenCalled();

      const boletasImpresas = printBoletasSpy.mock.calls[0][0];
      expect(boletasImpresas.length).toBe(1);
      expect(boletasImpresas[0].esReimpresion).toBe(true);
      expect(boletasImpresas[0].marcaImpresion).toBe('** REIMPRESIÓN **');

      expect(notificationServiceSpy.success).toHaveBeenCalledWith(
        expect.stringContaining('Reimpresión registrada (#LOG-999)')
      );
      expect(notificationServiceSpy.success).toHaveBeenCalledWith(
        expect.stringContaining('Atasco de papel')
      );

      expect(component.mostrarModalReimpresion()).toBe(false);
      expect(component.ticketPendienteReimpresion()).toBeNull();
    });

    it('should notify error toast if server responds with 409 Conflict when ticket is consumed', async () => {
      await setupComponent(mockTurno);
      const orden = component.colaEmisionService.encolarVenta(mockResumenReimp, 'Carlos Rojas');
      const ticketObjetivo = orden.boletas[0];

      vi.spyOn(component.ticketReimpresionService, 'solicitarReimpresion').mockReturnValue(
        throwError(() => new HttpErrorResponse({
          status: 409,
          statusText: 'Conflict',
          error: { message: 'La boleta ya fue consumida en la atracción.' }
        }))
      );

      component.onConfirmarReimpresion({
        ticket: ticketObjetivo,
        motivo: 'Falta de papel',
        codigoMotivo: 'FALTA_PAPEL'
      });
      fixture.detectChanges();

      expect(notificationServiceSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('ya fue consumida')
      );
      expect(component.procesandoReimpresion()).toBe(false);
    });

    it('should allow re-printing an individual ticket from the carousel button', async () => {
      await setupComponent(mockTurno);
      const orden = component.colaEmisionService.encolarVenta(mockResumenReimp, 'Carlos Rojas');
      component.mostrarColaEmision.set(true);
      fixture.detectChanges();

      const btnReimpCarrusel = fixture.debugElement.query(By.css('[data-testid="btn-reimprimir-boleta-carrusel"]'));
      expect(btnReimpCarrusel).toBeTruthy();

      btnReimpCarrusel.nativeElement.click();
      fixture.detectChanges();

      expect(component.mostrarModalReimpresion()).toBe(true);
      expect(component.ticketPendienteReimpresion()?.codigoBoleta).toBe(orden.boletas[0].codigoBoleta);
    });
  });

  describe('Consulta de Boletas en POS (HU-23.04, HU-23.05, HU-23.06)', () => {
    it('should open ConsultaTicketsComponent modal when clicking "Consultar Boletas" button in header', async () => {
      await setupComponent(mockTurno);

      const btnConsultar = fixture.debugElement.query(By.css('[data-testid="btn-abrir-consulta-tickets"]'));
      expect(btnConsultar).toBeTruthy();

      btnConsultar.nativeElement.click();
      fixture.detectChanges();

      expect(component.mostrarConsultaTickets()).toBe(true);

      const modalConsulta = fixture.debugElement.query(By.css('[data-testid="modal-consulta-tickets"]'));
      expect(modalConsulta).toBeTruthy();

      const compConsulta = fixture.debugElement.query(By.css('app-consulta-tickets'));
      expect(compConsulta).toBeTruthy();
    });

    it('should connect reimprimirTicket from ConsultaTicketsComponent to abrirModalReimpresionBoleta', async () => {
      await setupComponent(mockTurno);
      component.mostrarConsultaTickets.set(true);
      fixture.detectChanges();

      const testTicket: Ticket = {
        codigoBoleta: 'TDN-TEST-123',
        atraccionId: 1,
        atraccionNombre: 'Inflable Gigante',
        modalidadEtiqueta: '15 min',
        menorNombre: 'Leo',
        precioUnitario: 9000,
        estado: 'PAGADO'
      };

      const consultaCompEl = fixture.debugElement.query(By.css('app-consulta-tickets'));
      expect(consultaCompEl).toBeTruthy();
      const consultaComp = consultaCompEl.componentInstance;

      consultaComp.reimprimirTicket.emit(testTicket);
      fixture.detectChanges();

      expect(component.mostrarModalReimpresion()).toBe(true);
      expect(component.ticketPendienteReimpresion()?.codigoBoleta).toBe('TDN-TEST-123');
    });
  });
});
