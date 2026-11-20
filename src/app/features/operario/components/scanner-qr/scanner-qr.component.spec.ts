import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScannerQrComponent } from './scanner-qr.component';
import { OperacionService } from '../../../../core/services/operacion.service';
import { SoundNotificationService } from '../../../../core/services/sound-notification.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';

describe('ScannerQrComponent (HU-25.04..07, HU-34.05, HU-34.06)', () => {
  let component: ScannerQrComponent;
  let fixture: ComponentFixture<ScannerQrComponent>;

  let operacionServiceSpy: {
    escanerDesbloqueado: ReturnType<typeof signal<boolean>>;
    aforoCompleto: ReturnType<typeof signal<boolean>>;
    modalAforoCompletoAbierto: ReturnType<typeof signal<boolean>>;
    capacidadMaxima: ReturnType<typeof signal<number>>;
    ocupacionActual: ReturnType<typeof signal<number>>;
    validarTicketQr: ReturnType<typeof vi.fn>;
    autorizarIngresoForzadoSupervisor: ReturnType<typeof vi.fn>;
    cerrarModalAforoCompleto: ReturnType<typeof vi.fn>;
  };

  let soundServiceSpy: {
    reproducirBeepEscaneo: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    operacionServiceSpy = {
      escanerDesbloqueado: signal(true),
      aforoCompleto: signal(false),
      modalAforoCompletoAbierto: signal(false),
      capacidadMaxima: signal(12),
      ocupacionActual: signal(3),
      validarTicketQr: vi.fn().mockReturnValue(of({ aprobado: true, uuid: 'TEST-123' })),
      autorizarIngresoForzadoSupervisor: vi.fn().mockReturnValue(of(true)),
      cerrarModalAforoCompleto: vi.fn()
    };

    soundServiceSpy = {
      reproducirBeepEscaneo: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ScannerQrComponent],
      providers: [
        { provide: OperacionService, useValue: operacionServiceSpy },
        { provide: SoundNotificationService, useValue: soundServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScannerQrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.detenerCamara();
  });

  it('should create and render optical reticle and manual contingency field (HU-25.05, HU-25.07)', () => {
    expect(component).toBeTruthy();
    const reticula = fixture.debugElement.query(By.css('[data-testid="reticula-encuadre-qr"]'));
    expect(reticula).toBeTruthy();

    const inputManual = fixture.debugElement.query(By.css('[data-testid="input-contingencia-uuid"]'));
    expect(inputManual).toBeTruthy();
  });

  it('should process manual UUID when typed and clicked (HU-25.05)', () => {
    component.codigoManual = 'UUID-MANUAL-789';
    fixture.detectChanges();

    const btnValidar = fixture.debugElement.query(By.css('[data-testid="btn-validar-uuid-manual"]'));
    expect(btnValidar).toBeTruthy();

    btnValidar.nativeElement.click();
    expect(operacionServiceSpy.validarTicketQr).toHaveBeenCalledWith('UUID-MANUAL-789');
    expect(component.codigoManual).toBe('');
  });

  it('should render capacity warning overlay and supervisor trigger when aforo is full (HU-34.05)', () => {
    operacionServiceSpy.escanerDesbloqueado.set(false);
    operacionServiceSpy.aforoCompleto.set(true);
    fixture.detectChanges();

    const overlay = fixture.debugElement.query(By.css('[data-testid="overlay-aforo-completo"]'));
    expect(overlay).toBeTruthy();
    expect(overlay.nativeElement.textContent).toContain('AFORO COMPLETO');
  });

  it('should render modal aforo completo and call supervisor authorization (HU-34.05)', () => {
    operacionServiceSpy.modalAforoCompletoAbierto.set(true);
    fixture.detectChanges();

    const modal = fixture.debugElement.query(By.css('[data-testid="modal-aforo-completo"]'));
    expect(modal).toBeTruthy();

    const btnOverride = fixture.debugElement.query(By.css('[data-testid="btn-ingreso-forzado-supervisor"]'));
    expect(btnOverride).toBeTruthy();

    component.pinSupervisor = '1234';
    btnOverride.nativeElement.click();
    expect(operacionServiceSpy.autorizarIngresoForzadoSupervisor).toHaveBeenCalledWith('1234');
  });

  it('should render fallback buttons (capture photo and retry live) when camera is inactive', () => {
    component.camaraActiva.set(false);
    fixture.detectChanges();

    const btnFoto = fixture.debugElement.query(By.css('[data-testid="btn-capturar-foto-qr"]'));
    expect(btnFoto).toBeTruthy();
    expect(btnFoto.nativeElement.textContent).toContain('Tomar Foto del QR');

    const btnReintentar = fixture.debugElement.query(By.css('[data-testid="btn-reintentar-camara"]'));
    expect(btnReintentar).toBeTruthy();

    const btnFotoContingencia = fixture.debugElement.query(By.css('[data-testid="btn-foto-contingencia"]'));
    expect(btnFotoContingencia).toBeTruthy();
  });

  it('should detect insecure HTTP context and set helpful mobile message', async () => {
    vi.spyOn(component, 'esContextoInseguro').mockReturnValue(true);
    // Mock navigator.mediaDevices as undefined in insecure context
    const originalMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
      writable: true
    });

    await component.iniciarCamara();
    fixture.detectChanges();

    expect(component.camaraActiva()).toBe(false);
    expect(component.mensajeErrorCamara()).toContain('HTTPS');

    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
      writable: true
    });
  });

  it('should process QR from captured photo file successfully', async () => {
    const mockFile = new File(['mock content'], 'qr-test.png', { type: 'image/png' });
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // Spy on procesarCodigoEscaneado
    const procesarSpy = vi.spyOn(component, 'procesarCodigoEscaneado').mockImplementation(() => {});

    // Mock BrowserMultiFormatReader.prototype.decodeFromImageUrl
    const zxing = await import('@zxing/browser');
    const decodeSpy = vi.spyOn(zxing.BrowserCodeReader.prototype, 'decodeFromImageUrl').mockResolvedValue({
      getText: () => 'MOCK-UUID-DESDE-FOTO'
    } as any);

    const mockEvent = {
      target: {
        files: [mockFile],
        value: 'dummy'
      }
    } as unknown as Event;

    await component.onFileCaptured(mockEvent);

    expect(createObjectUrlSpy).toHaveBeenCalledWith(mockFile);
    expect(decodeSpy).toHaveBeenCalledWith('blob:mock-url');
    expect(procesarSpy).toHaveBeenCalledWith('MOCK-UUID-DESDE-FOTO');
    expect(soundServiceSpy.reproducirBeepEscaneo).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:mock-url');

    decodeSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });

  it('should show guide modal when camera permission is denied on retry (Android UX)', async () => {
    component.camaraActiva.set(false);
    component.permisoDenegado.set(true);
    fixture.detectChanges();

    const linkGuia = fixture.debugElement.query(By.css('[data-testid="btn-abrir-guia-permisos"]'));
    expect(linkGuia).toBeTruthy();

    linkGuia.nativeElement.click();
    fixture.detectChanges();

    expect(component.mostrarGuiaPermisos()).toBe(true);
    const modalGuia = fixture.debugElement.query(By.css('[data-testid="modal-guia-permisos-camara"]'));
    expect(modalGuia).toBeTruthy();
    expect(modalGuia.nativeElement.textContent).toContain('Habilitar Cámara en Android');

    const btnCerrar = fixture.debugElement.query(By.css('[data-testid="btn-guia-cerrar"]'));
    expect(btnCerrar).toBeTruthy();
    btnCerrar.nativeElement.click();
    fixture.detectChanges();

    expect(component.mostrarGuiaPermisos()).toBe(false);
  });

  it('should trigger reintentarCamara and open guide if camera throws NotAllowedError', async () => {
    const originalMediaDevices = navigator.mediaDevices;
    const mockGetUserMedia = vi.fn().mockRejectedValue({
      name: 'NotAllowedError',
      message: 'Permission denied'
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
      writable: true
    });

    await component.reintentarCamara();
    fixture.detectChanges();

    expect(component.permisoDenegado()).toBe(true);
    expect(component.mostrarGuiaPermisos()).toBe(true);
    expect(component.mensajeErrorCamara()).toContain('denegado');

    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
      writable: true
    });
  });

  it('should execute abrirAjustesDispositivo with android intent', () => {
    const redirSpy = vi.spyOn(component, 'redirigirAjustes').mockImplementation(() => {});
    component.abrirAjustesDispositivo();
    expect(redirSpy).toHaveBeenCalledWith(expect.stringContaining('APPLICATION_DETAILS_SETTINGS'));
    redirSpy.mockRestore();
  });

  it('should prioritize rear camera by default and toggle cameras on alternarCamara', async () => {
    expect(component.modoCamaraTrasera()).toBe(true);

    const originalMediaDevices = navigator.mediaDevices;
    const mockGetUserMedia = vi.fn().mockImplementation((constraints: any) => {
      const devId =
        constraints?.video?.deviceId?.exact ||
        (constraints?.video?.facingMode?.exact === 'user' ? 'cam-front-1' : 'cam-rear-1');
      const facing = devId === 'cam-rear-1' ? 'environment' : 'user';
      const track = {
        stop: vi.fn(),
        getSettings: () => ({ facingMode: facing, deviceId: devId })
      };
      return Promise.resolve({
        getVideoTracks: () => [track],
        getTracks: () => [track]
      });
    });
    const mockEnumerateDevices = vi.fn().mockResolvedValue([
      { kind: 'videoinput', deviceId: 'cam-rear-1', label: 'Back Camera 0' },
      { kind: 'videoinput', deviceId: 'cam-front-1', label: 'Front Camera 1' }
    ]);

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
        enumerateDevices: mockEnumerateDevices
      },
      configurable: true,
      writable: true
    });

    await component.iniciarCamara();
    fixture.detectChanges();

    expect(mockGetUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: { facingMode: { exact: 'environment' } }
      })
    );
    expect(component.camaraActiva()).toBe(true);
    expect(component.hayMultiplesCamaras()).toBe(true);
    expect(component.dispositivoCamaraActivoId()).toBe('cam-rear-1');

    // Alternar cámara
    await component.alternarCamara();
    fixture.detectChanges();

    expect(component.dispositivoCamaraActivoId()).toBe('cam-front-1');
    expect(component.modoCamaraTrasera()).toBe(false);

    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
      writable: true
    });
  });

  it('should render toggle camera button in DOM when camaraActiva is true', () => {
    component.camaraActiva.set(true);
    fixture.detectChanges();

    const btnAlternar = fixture.debugElement.query(By.css('[data-testid="btn-alternar-camara"]'));
    expect(btnAlternar).toBeTruthy();
  });
});
