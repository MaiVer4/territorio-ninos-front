import { ComponentFixture, TestBed } from '@angular/core/testing';
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

    await TestBed.configureTestingModule({
      imports: [TaquillaPosComponent],
      providers: [
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
      expect(notificationServiceSpy.success).toHaveBeenCalledWith(
        expect.stringContaining('Orden liquidada exitosamente')
      );
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
  });
});
