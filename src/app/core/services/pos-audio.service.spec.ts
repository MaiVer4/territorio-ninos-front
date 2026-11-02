import { TestBed } from '@angular/core/testing';
import { PosAudioService } from './pos-audio.service';

describe('PosAudioService', () => {
  let service: PosAudioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PosAudioService);
  });

  it('should be created and have sound enabled by default', () => {
    expect(service).toBeTruthy();
    expect(service.sonidoHabilitado()).toBe(true);
  });

  it('should allow toggling sound enabled state', () => {
    service.setSonidoHabilitado(false);
    expect(service.sonidoHabilitado()).toBe(false);

    // When disabled, reproducing sound returns false immediately
    const result = service.reproducirConfirmacionPago();
    expect(result).toBe(false);

    service.setSonidoHabilitado(true);
    expect(service.sonidoHabilitado()).toBe(true);
  });

  it('should safely handle playback with mock AudioContext without throwing', () => {
    const mockGainNode = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      },
      connect: vi.fn()
    };

    const mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn()
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as any
    };

    const mockAudioContext = {
      state: 'running',
      currentTime: 10,
      destination: {},
      createOscillator: vi.fn().mockReturnValue(mockOscillator),
      createGain: vi.fn().mockReturnValue(mockGainNode),
      close: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn().mockResolvedValue(undefined)
    };

    const originalAudioContext = window.AudioContext;
    (window as any).AudioContext = vi.fn(function () {
      return mockAudioContext;
    });

    try {
      const emitted = service.reproducirConfirmacionPago();
      expect(emitted).toBe(true);
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalled();

      // Trigger onended callback to verify context close
      if (typeof mockOscillator.onended === 'function') {
        mockOscillator.onended({} as any);
        expect(mockAudioContext.close).toHaveBeenCalled();
      }
    } finally {
      (window as any).AudioContext = originalAudioContext;
    }
  });

  it('should resume audio context if it is suspended', () => {
    const mockAudioContext = {
      state: 'suspended',
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn().mockReturnValue({
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      }),
      createGain: vi.fn().mockReturnValue({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn()
      }),
      close: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn().mockResolvedValue(undefined)
    };

    const originalAudioContext = window.AudioContext;
    (window as any).AudioContext = vi.fn(function () {
      return mockAudioContext;
    });

    try {
      service.reproducirConfirmacionPago();
      expect(mockAudioContext.resume).toHaveBeenCalled();
    } finally {
      (window as any).AudioContext = originalAudioContext;
    }
  });

  it('should return false safely when AudioContext is unavailable', () => {
    const originalAudioContext = window.AudioContext;
    (window as any).AudioContext = undefined;
    (window as any).webkitAudioContext = undefined;

    try {
      const result = service.reproducirConfirmacionPago();
      expect(result).toBe(false);
    } finally {
      (window as any).AudioContext = originalAudioContext;
    }
  });
});
