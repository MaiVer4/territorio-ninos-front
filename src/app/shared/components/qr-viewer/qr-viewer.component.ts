import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Input,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as QRCode from 'qrcode';
import { ValidacionOpticaQr } from '../../../core/models/ticket.model';

@Component({
  selector: 'app-qr-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      data-testid="qr-viewer-container"
      class="flex flex-col items-center justify-center p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs transition-all"
      [style.maxWidth.px]="size + 32">

      @if (payloadEfectivo()) {
        <div
          class="relative flex items-center justify-center bg-white p-1 rounded-lg"
          [style.width.px]="size"
          [style.height.px]="size">
          <svg
            data-testid="qr-viewer-svg"
            [attr.viewBox]="viewBox()"
            [attr.width]="size"
            [attr.height]="size"
            shape-rendering="crispEdges"
            class="w-full h-full select-none"
            role="img"
            [attr.aria-label]="ariaLabel">
            <!-- Fondo de alto contraste / Quiet Zone -->
            <rect
              x="0"
              y="0"
              [attr.width]="tamanoTotal()"
              [attr.height]="tamanoTotal()"
              [attr.fill]="lightColor" />
            <!-- Trazado vectorial de módulos oscuros -->
            <path
              data-testid="qr-viewer-path-dark"
              [attr.d]="svgPath()"
              [attr.fill]="darkColor" />
          </svg>
        </div>

        @if (mostrarLeyenda) {
          <div class="mt-1.5 text-center w-full px-1">
            @if (codigoVisible) {
              <span
                data-testid="qr-viewer-codigo"
                class="block text-[11px] font-mono font-bold text-slate-800 tracking-wider truncate">
                {{ codigoVisible }}
              </span>
            }
            <span
              data-testid="qr-viewer-payload"
              class="block text-[9px] font-mono text-slate-400 truncate max-w-full"
              [title]="payloadEfectivo()">
              {{ payloadEfectivo() }}
            </span>
          </div>
        }

        @if (mostrarInsigniaOptica) {
          <div
            data-testid="qr-viewer-optical-badge"
            class="mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1"
            [ngClass]="validacionOptica().esValido ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'">
            <span>{{ validacionOptica().esValido ? '✓ Óptimo para escaneo' : '⚠ Revisar densidad' }}</span>
          </div>
        }
      } @else {
        <div
          data-testid="qr-viewer-empty"
          class="flex flex-col items-center justify-center text-slate-400 p-4 border border-dashed border-slate-200 rounded-lg text-center"
          [style.width.px]="size"
          [style.height.px]="size">
          <span class="text-xl mb-1">📷</span>
          <span class="text-[10px] font-medium text-slate-500">Sin carga útil QR</span>
          <span class="text-[9px] text-slate-400">Asigne un ticket o UUID</span>
        </div>
      }
    </div>
  `
})
export class QrViewerComponent {
  private readonly _value = signal<string>('');
  private readonly _uuid = signal<string>('');

  @Input()
  set value(val: string | null | undefined) {
    this._value.set(val?.trim() || '');
  }
  get value(): string {
    return this._value();
  }

  @Input()
  set uuid(val: string | null | undefined) {
    this._uuid.set(val?.trim() || '');
  }
  get uuid(): string {
    return this._uuid();
  }

  @Input() codigoVisible: string = '';
  @Input() size: number = 148;
  @Input() margin: number = 4;
  @Input() errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M';
  @Input() darkColor: string = '#000000';
  @Input() lightColor: string = '#FFFFFF';
  @Input() mostrarLeyenda: boolean = true;
  @Input() mostrarInsigniaOptica: boolean = false;
  @Input() ariaLabel: string = 'Código QR de validación de boleta';

  readonly payloadEfectivo = computed(() => {
    return this._value() || this._uuid();
  });

  private readonly qrMatrix = computed(() => {
    const payload = this.payloadEfectivo();
    if (!payload) return null;

    try {
      return QRCode.create(payload, {
        errorCorrectionLevel: this.errorCorrectionLevel
      });
    } catch {
      return null;
    }
  });

  readonly tamanoMatriz = computed(() => {
    return this.qrMatrix()?.modules.size ?? 0;
  });

  readonly tamanoTotal = computed(() => {
    const size = this.tamanoMatriz();
    return size > 0 ? size + this.margin * 2 : 0;
  });

  readonly viewBox = computed(() => {
    const total = this.tamanoTotal();
    return total > 0 ? `0 0 ${total} ${total}` : '0 0 0 0';
  });

  readonly svgPath = computed(() => {
    const matrix = this.qrMatrix();
    if (!matrix) return '';

    const size = matrix.modules.size;
    const data = matrix.modules.data;
    const margin = this.margin;
    let path = '';

    for (let r = 0; r < size; r++) {
      let colStart = -1;
      let len = 0;

      for (let c = 0; c < size; c++) {
        const isDark = Boolean(data[r * size + c]);
        if (isDark) {
          if (colStart === -1) {
            colStart = c;
            len = 1;
          } else {
            len++;
          }
        } else if (colStart !== -1) {
          path += `M${colStart + margin} ${r + margin}h${len}v1h-${len}Z `;
          colStart = -1;
          len = 0;
        }
      }

      if (colStart !== -1) {
        path += `M${colStart + margin} ${r + margin}h${len}v1h-${len}Z `;
      }
    }

    return path.trim();
  });

  /**
   * Valida la compatibilidad óptica para cámaras de celulares de operarios (HU-20.06 / Notion: CA-04).
   * Evalúa bajo nivel de densidad (versión <= 4), contraste cromático 21:1 y zona de silencio adecuada.
   */
  readonly validacionOptica = computed<ValidacionOpticaQr>(() => {
    const payload = this.payloadEfectivo();
    if (!payload) {
      return {
        esValido: false,
        versionQr: 0,
        tamanoMatriz: 0,
        nivelCorreccion: this.errorCorrectionLevel,
        margenModulos: this.margin,
        contrasteAlto: false,
        detalles: 'Carga útil vacía'
      };
    }

    const matrix = this.qrMatrix();
    if (!matrix) {
      return {
        esValido: false,
        versionQr: 0,
        tamanoMatriz: 0,
        nivelCorreccion: this.errorCorrectionLevel,
        margenModulos: this.margin,
        contrasteAlto: false,
        detalles: 'Error al calcular matriz QR'
      };
    }

    const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.trim());
    const darkClean = this.darkColor.trim().toLowerCase();
    const lightClean = this.lightColor.trim().toLowerCase();
    const contrasteAlto =
      (darkClean === '#000000' || darkClean === '#000' || darkClean === 'black') &&
      (lightClean === '#ffffff' || lightClean === '#fff' || lightClean === 'white');

    const esOptico = matrix.version <= 4 && this.margin >= 2 && contrasteAlto;

    return {
      esValido: esOptico,
      versionQr: matrix.version,
      tamanoMatriz: matrix.modules.size,
      nivelCorreccion: this.errorCorrectionLevel,
      margenModulos: this.margin,
      contrasteAlto,
      detalles: esUuid
        ? `UUID v4 óptimo para escáner móvil (Versión ${matrix.version}, ${matrix.modules.size}x${matrix.modules.size} módulos)`
        : `Carga útil estándar (Versión ${matrix.version}, ${matrix.modules.size}x${matrix.modules.size} módulos)`
    };
  });

  /**
   * Genera la cadena de marcado SVG mediante la librería `qrcode` para comandos de impresión o exportación.
   */
  async generarSvgString(): Promise<string> {
    const payload = this.payloadEfectivo();
    if (!payload) return '';

    return QRCode.toString(payload, {
      type: 'svg',
      margin: this.margin,
      width: this.size,
      errorCorrectionLevel: this.errorCorrectionLevel,
      color: { dark: this.darkColor, light: this.lightColor }
    });
  }

  /**
   * Devuelve el marcado SVG síncrono correspondiente al estado actual del componente.
   */
  obtenerSvgMarkup(): string {
    const total = this.tamanoTotal();
    const path = this.svgPath();
    if (!path) return '';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${this.size}" height="${this.size}" shape-rendering="crispEdges"><rect x="0" y="0" width="${total}" height="${total}" fill="${this.lightColor}"/><path d="${path}" fill="${this.darkColor}"/></svg>`;
  }
}
