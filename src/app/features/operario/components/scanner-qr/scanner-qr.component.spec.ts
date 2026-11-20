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

    await component.iniciarCamara();
    fixture.detectChanges();

    expect(component.camaraActiva()).toBe(false);
    expect(component.mensajeErrorCamara()).toContain('La cámara en vivo requiere HTTPS en móviles');
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
});
