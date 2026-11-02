import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject,
  output,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../../../core/services/websocket.service';

export interface InfoCronometroTick {
  segundosRestantes: number;
  segundosExcedidos: number;
  agotado: boolean;
  preExpiracion: boolean;
}

@Component({
  selector: 'app-cronometro',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      data-testid="cronometro-container"
      class="font-mono font-black tracking-tight inline-flex items-center gap-1">
      
      @if (enPausa) {
        <!-- Modo Pausado: Congelado con badge -->
        <span
          data-testid="cronometro-display"
          class="text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
          {{ displayTexto() }}
        </span>
      } @else if (estaAgotado()) {
        <!-- Modo Tiempo Agotado: Rojo con contador progresivo de exceso (HU-31.05) -->
        <span
          data-testid="cronometro-display"
          class="text-red-700 bg-red-100 px-2 py-0.5 rounded-md animate-pulse">
          +{{ displayTexto() }}
        </span>
      } @else if (estaPreExpiracion()) {
        <!-- Modo Pre-Expiración: Amarillo advertencia con parpadeo suave (HU-30.03, HU-30.04) -->
        <span
          data-testid="cronometro-display"
          class="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md animate-pulse">
          {{ displayTexto() }}
        </span>
      } @else {
        <!-- Modo Normal: Verde estándar -->
        <span
          data-testid="cronometro-display"
          class="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
          {{ displayTexto() }}
        </span>
      }
    </div>
  `
})
export class CronometroComponent implements OnInit, OnDestroy {
  private wsService = inject(WebSocketService);

  @Input() horaFin!: string;
  @Input() enPausa = false;
  @Input() segundosCongelados?: number;

  tiempoActualizado = output<InfoCronometroTick>();
  tiempoAgotado = output<void>();
  preExpiracion = output<void>();

  readonly segundosRestantes = signal<number>(0);
  readonly segundosExcedidos = signal<number>(0);
  readonly estaAgotado = signal<boolean>(false);
  readonly estaPreExpiracion = signal<boolean>(false);

  private notificadoAgotado = false;
  private notificadoPreExpiracion = false;
  private timerId: ReturnType<typeof setInterval> | null = null;

  readonly displayTexto = computed<string>(() => {
    if (this.enPausa && this.segundosCongelados !== undefined) {
      return this.formatearMmSs(this.segundosCongelados);
    }

    if (this.estaAgotado()) {
      return this.formatearMmSs(this.segundosExcedidos());
    }

    return this.formatearMmSs(this.segundosRestantes());
  });

  ngOnInit(): void {
    this.calcularTiempo();
    // Ticks cada 250ms para máxima precisión (<500ms RNF8 / HU-27.09)
    this.timerId = setInterval(() => {
      this.calcularTiempo();
    }, 250);
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private calcularTiempo(): void {
    if (this.enPausa) {
      const congelados = this.segundosCongelados ?? this.segundosRestantes();
      this.segundosRestantes.set(congelados);
      return;
    }

    if (!this.horaFin) return;

    const horaFinMs = Date.parse(this.horaFin);
    if (isNaN(horaFinMs)) return;

    // Cálculo contra timestamp del servidor (HU-27.09)
    const serverNowMs = this.wsService.obtenerTiempoServidorActual();
    const diffMs = horaFinMs - serverNowMs;

    if (diffMs > 0) {
      const restSeg = Math.ceil(diffMs / 1000);
      this.segundosRestantes.set(restSeg);
      this.segundosExcedidos.set(0);
      this.estaAgotado.set(false);

      const esPre = restSeg <= 120; // 02:00 o menos (HU-30.04)
      this.estaPreExpiracion.set(esPre);

      if (esPre && !this.notificadoPreExpiracion) {
        this.notificadoPreExpiracion = true;
        this.preExpiracion.emit();
      }

      this.tiempoActualizado.emit({
        segundosRestantes: restSeg,
        segundosExcedidos: 0,
        agotado: false,
        preExpiracion: esPre
      });
    } else {
      // 00:00 o tiempo excedido (HU-31.05)
      const excedidoSeg = Math.floor(Math.abs(diffMs) / 1000);
      this.segundosRestantes.set(0);
      this.segundosExcedidos.set(excedidoSeg);
      this.estaAgotado.set(true);
      this.estaPreExpiracion.set(false);

      if (!this.notificadoAgotado) {
        this.notificadoAgotado = true;
        this.tiempoAgotado.emit();
      }

      this.tiempoActualizado.emit({
        segundosRestantes: 0,
        segundosExcedidos: excedidoSeg,
        agotado: true,
        preExpiracion: false
      });
    }
  }

  private formatearMmSs(totalSegundos: number): string {
    const minutos = Math.floor(Math.max(0, totalSegundos) / 60);
    const segundos = Math.max(0, totalSegundos) % 60;
    const mm = minutos < 10 ? `0${minutos}` : `${minutos}`;
    const ss = segundos < 10 ? `0${segundos}` : `${segundos}`;
    return `${mm}:${ss}`;
  }
}
