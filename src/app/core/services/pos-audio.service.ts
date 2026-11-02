import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PosAudioService {
  readonly sonidoHabilitado = signal<boolean>(true);
  private activeCtx: AudioContext | null = null;

  /**
   * Reproduce un chime sutil y breve de confirmación de pago
   * utilizando la Web Audio API nativa sin requerir archivos externos.
   *
   * @returns true si el sonido fue emitido, false si está deshabilitado o no soportado.
   */
  reproducirConfirmacionPago(): boolean {
    if (!this.sonidoHabilitado()) {
      return false;
    }

    try {
      if (typeof window === 'undefined') {
        return false;
      }

      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) {
        return false;
      }

      // Cerrar preventivamente el contexto anterior si aún seguía abierto para evitar agotar el límite del navegador
      if (this.activeCtx && this.activeCtx.state !== 'closed') {
        try {
          this.activeCtx.close().catch(() => {});
        } catch {
          // Ignorar errores al cerrar instancia previa
        }
        this.activeCtx = null;
      }

      const ctx = new AudioCtxClass();
      this.activeCtx = ctx;

      // En navegadores modernos con autoplay bloqueado, intentar reanudar
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';

      // Acorde ascendente suave: C5 (523.25 Hz) -> G5 (783.99 Hz)
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(783.99, now + 0.08);

      // Envolvente de volumen muy suave y sutil (ganancia máxima 0.06)
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.24);

      osc.onended = () => {
        try {
          if (this.activeCtx === ctx) {
            this.activeCtx = null;
          }
          ctx.close().catch(() => {});
        } catch {
          // Ignorar errores al cerrar
        }
      };

      return true;
    } catch {
      // Entorno sin audio o bloqueo del navegador: no interrumpir la transacción
      return false;
    }
  }

  setSonidoHabilitado(habilitado: boolean): void {
    this.sonidoHabilitado.set(habilitado);
  }
}
