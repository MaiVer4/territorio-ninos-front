import { TestBed } from '@angular/core/testing';
import { SoundNotificationService } from './sound-notification.service';

describe('SoundNotificationService (HU-25.06, HU-30.05, HU-31.03..06)', () => {
  let service: SoundNotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SoundNotificationService]
    });
    service = TestBed.inject(SoundNotificationService);
  });

  afterEach(() => {
    service.silenciarTodasLasAlarmas();
    vi.restoreAllMocks();
  });

  it('should be created with default enabled signals', () => {
    expect(service).toBeTruthy();
    expect(service.sonidoHabilitado()).toBe(true);
    expect(service.vibracionHabilitada()).toBe(true);
  });

  it('should trigger vibration when reproducirBeepEscaneo is called (HU-25.06)', () => {
    const vibrateSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateSpy,
      configurable: true,
      writable: true
    });

    service.reproducirBeepEscaneo();
    expect(vibrateSpy).toHaveBeenCalledWith(120);
  });

  it('should trigger vibration for pre-expiracion pattern (HU-30.05)', () => {
    const vibrateSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateSpy,
      configurable: true,
      writable: true
    });

    const result = service.vibrarPreExpiracion();
    expect(vibrateSpy).toHaveBeenCalledWith([100, 60, 100]);
    expect(result).toBe(true);
  });

  it('should manage alarm registration, status and silencing (HU-31.04, HU-31.06)', () => {
    const idSesion = 'sesion-test-123';
    expect(service.estaAlarmaSonando(idSesion)).toBe(false);

    service.reproducirAlarmaTiempoAgotado(idSesion);
    expect(service.estaAlarmaSonando(idSesion)).toBe(true);

    // Call again should not duplicate
    expect(service.reproducirAlarmaTiempoAgotado(idSesion)).toBe(false);

    // Silence alarm
    const silenced = service.silenciarAlarma(idSesion);
    expect(silenced).toBe(true);
    expect(service.estaAlarmaSonando(idSesion)).toBe(false);
  });

  it('should silence all active alarms when silenciarTodasLasAlarmas is called', () => {
    service.reproducirAlarmaTiempoAgotado('s1');
    service.reproducirAlarmaTiempoAgotado('s2');
    expect(service.estaAlarmaSonando('s1')).toBe(true);
    expect(service.estaAlarmaSonando('s2')).toBe(true);

    service.silenciarTodasLasAlarmas();
    expect(service.estaAlarmaSonando('s1')).toBe(false);
    expect(service.estaAlarmaSonando('s2')).toBe(false);
  });

  it('should silence alarms when sonidoHabilitado is set to false', () => {
    service.reproducirAlarmaTiempoAgotado('s3');
    expect(service.estaAlarmaSonando('s3')).toBe(true);

    service.setSonidoHabilitado(false);
    expect(service.sonidoHabilitado()).toBe(false);
    expect(service.estaAlarmaSonando('s3')).toBe(false);
  });
});
