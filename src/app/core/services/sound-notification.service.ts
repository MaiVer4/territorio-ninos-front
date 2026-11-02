import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundNotificationService {
  readonly sonidoHabilitado = signal<boolean>(true);
  readonly vibracionHabilitada = signal<boolean>(true);

  private audioCtx: AudioContext | null = null;
  private readonly alarmasActivas = new Map<string, { intervalId?: ReturnType<typeof setInterval>; ctx?: AudioContext }>();

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) {
      return null;
    }

    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      try {
        this.audioCtx = new AudioCtxClass();
      } catch {
        return null;
      }
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  /**
   * Reproduce pitido corto de escaneo QR y activa vibración háptica (HU-25.06).
   */
  reproducirBeepEscaneo(): boolean {
    if (this.vibracionHabilitada() && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(120);
      } catch {
        // Vibración no soportada o bloqueada
      }
    }

    if (!this.sonidoHabilitado()) {
      return false;
    }

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return false;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reproduce alarma distintiva de 3 pulsos al completarse la cuenta regresiva 00:00 (HU-31.04).
   */
  reproducirAlarmaTiempoAgotado(idSesion: string): boolean {
    // Si ya existe una alarma sonando para esta sesión, no duplicar
    if (this.alarmasActivas.has(idSesion)) {
      return false;
    }

    if (this.vibracionHabilitada() && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([200, 100, 200, 100, 200]);
      } catch {
        // Vibración no soportada
      }
    }

    if (!this.sonidoHabilitado()) {
      // Registramos la sesión para poder ser silenciada
      this.alarmasActivas.set(idSesion, {});
      return false;
    }

    const emitirTresPulsos = () => {
      try {
        const ctx = this.getAudioContext();
        if (!ctx) return;

        const pulseTimes = [0, 0.22, 0.44];
        pulseTimes.forEach(offset => {
          const startTime = ctx.currentTime + offset;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(960, startTime);
          osc.frequency.setValueAtTime(1200, startTime + 0.08);

          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.17);
        });
      } catch {
        // Ignorar fallas de audio
      }
    };

    // Emitir de inmediato la primera ráfaga de 3 pulsos
    emitirTresPulsos();

    // Repetir periódicamente cada 4 segundos hasta que el operario silencie
    const intervalId = setInterval(() => {
      emitirTresPulsos();
    }, 4000);

    this.alarmasActivas.set(idSesion, { intervalId });
    return true;
  }

  /**
   * Apaga y silencia el tono acústico para una tarjeta específica (HU-31.06).
   */
  silenciarAlarma(idSesion: string): boolean {
    const registro = this.alarmasActivas.get(idSesion);
    if (!registro) {
      return false;
    }

    if (registro.intervalId) {
      clearInterval(registro.intervalId);
    }

    this.alarmasActivas.delete(idSesion);
    return true;
  }

  /**
   * Silencia todas las alarmas activas simultáneamente.
   */
  silenciarTodasLasAlarmas(): void {
    this.alarmasActivas.forEach(registro => {
      if (registro.intervalId) {
        clearInterval(registro.intervalId);
      }
    });
    this.alarmasActivas.clear();
  }

  /**
   * Dispara patrón de vibración preventiva corta (100ms, 60ms pausa, 100ms) para pre-expiración (HU-30.05).
   */
  vibrarPreExpiracion(): boolean {
    if (this.vibracionHabilitada() && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        return navigator.vibrate([100, 60, 100]);
      } catch {
        return false;
      }
    }
    return false;
  }

  estaAlarmaSonando(idSesion: string): boolean {
    return this.alarmasActivas.has(idSesion);
  }

  setSonidoHabilitado(habilitado: boolean): void {
    this.sonidoHabilitado.set(habilitado);
    if (!habilitado) {
      this.silenciarTodasLasAlarmas();
    }
  }

  setVibracionHabilitada(habilitada: boolean): void {
    this.vibracionHabilitada.set(habilitada);
  }
}
