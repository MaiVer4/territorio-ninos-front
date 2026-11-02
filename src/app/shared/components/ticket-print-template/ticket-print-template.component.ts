import { ChangeDetectionStrategy, Component, computed, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdenEmisionFisica } from '../../../core/models/atraccion.model';
import { Ticket } from '../../../core/models/ticket.model';
import { ConfiguracionParque } from '../../../core/models/configuracion.model';
import { QrViewerComponent } from '../qr-viewer/qr-viewer.component';

@Component({
  selector: 'app-ticket-print-template',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, QrViewerComponent],
  template: `
    <div
      data-testid="ticket-print-template-container"
      class="ticket-print-root font-mono text-black bg-white select-none"
      [ngClass]="paperWidthMm === 58 ? 'print-roll-58mm' : 'print-roll-80mm'">

      @for (boleta of boletasEfectivas(); track boleta.codigoBoleta || boleta.uuid || $index) {
        <article
          [attr.data-testid]="'print-ticket-sheet-' + $index"
          class="ticket-thermal-sheet">

          <!-- Encabezado Fiscal del Parque -->
          <header class="text-center pb-2 mb-2 border-b border-dashed border-black/80" data-testid="print-parque-header">
            <div class="inline-block px-1.5 py-0.5 bg-black text-white text-[10px] font-bold rounded mb-1">
              TDN
            </div>
            <h1 class="font-extrabold uppercase tracking-wide leading-tight text-xs">
              {{ datosParque().nombreComercial }}
            </h1>
            <p class="text-[9px] leading-tight">
              {{ datosParque().razonSocial }}
            </p>
            <p class="text-[9px] leading-tight">NIT: {{ datosParque().nit }}</p>
            <p class="text-[9px] leading-tight">{{ datosParque().direccion }}</p>
            <p class="text-[9px] leading-tight">{{ datosParque().ciudad }} · Tel: {{ datosParque().telefono }}</p>
          </header>

          <!-- Metadatos de la Transacción y Boleta -->
          <section class="space-y-0.5 pb-2 mb-2 border-b border-dashed border-black/80 text-[10px]">
            <div class="flex justify-between font-bold">
              <span>BOLETA:</span>
              <span data-testid="print-ticket-codigo">{{ boleta.codigoBoleta }}</span>
            </div>
            <div class="flex justify-between text-black/80">
              <span>ORDEN:</span>
              <span>#{{ boleta.idOrden || orden?.idOrden || 'POS' }}</span>
            </div>
            <div class="flex justify-between text-black/80">
              <span>EMISIÓN:</span>
              <span>{{ formatearFecha(boleta.fechaEmision || orden?.fechaEmision) }}</span>
            </div>
            <div class="flex justify-between text-black/80">
              <span>TITULAR:</span>
              <span class="truncate max-w-[170px]">{{ boleta.clienteNombre || orden?.clienteNombre || 'Cliente de Mostrador' }}</span>
            </div>
            @if (boleta.clienteDocumento) {
              <div class="flex justify-between text-black/80">
                <span>DOC:</span>
                <span>{{ boleta.clienteDocumento }}</span>
              </div>
            }
            <div class="flex justify-between font-bold pt-1 border-t border-dotted border-black/40 text-[11px]">
              <span>MENOR:</span>
              <span data-testid="print-ticket-menor" class="truncate max-w-[170px]">{{ boleta.menorNombre }}</span>
            </div>
          </section>

          <!-- Detalle de Atracción y Tarifa -->
          <section class="pb-2 mb-2 border-b border-dashed border-black/80 space-y-1" data-testid="print-ticket-atraccion">
            <div class="flex justify-between font-extrabold text-xs">
              <span class="uppercase">{{ boleta.atraccionNombre }}</span>
              <span data-testid="print-ticket-total">\${{ boleta.precioUnitario.toLocaleString('es-CO') }}</span>
            </div>
            <div class="flex justify-between text-[10px] text-black/80">
              <span>Modalidad / Duración:</span>
              <span class="font-bold">{{ boleta.modalidadEtiqueta }}</span>
            </div>
            <div class="flex justify-between text-[10px] text-black/80">
              <span>Medio de Pago:</span>
              <span>{{ boleta.metodoPago || orden?.metodoPago || 'PAGO POS' }}</span>
            </div>
            <div class="flex justify-between font-extrabold text-xs pt-1 border-t border-dotted border-black/60">
              <span>VALOR BOLETA</span>
              <span>\${{ boleta.precioUnitario.toLocaleString('es-CO') }} COP</span>
            </div>
          </section>

          <!-- Código QR Vectorial de Validación (HU-20.05 / HU-20.06 / HU-21.05) -->
          <section class="flex flex-col items-center justify-center my-2" data-testid="print-ticket-qr">
            <app-qr-viewer
              [value]="boleta.codigoQr || boleta.uuid || boleta.codigoBoleta"
              [uuid]="boleta.uuid || ''"
              [codigoVisible]="boleta.codigoBoleta"
              [size]="paperWidthMm === 58 ? 116 : 140"
              [margin]="4"
              errorCorrectionLevel="M"
              [mostrarLeyenda]="true">
            </app-qr-viewer>
          </section>

          <!-- Normas de Seguridad y Mensaje de Pie Legal -->
          <footer class="pt-2 border-t border-dashed border-black/80 text-center space-y-1 text-[8.5px] leading-tight" data-testid="print-ticket-pie">
            <p class="font-bold uppercase tracking-wider text-[9px]">Normas de Seguridad</p>
            <p class="text-justify whitespace-pre-line text-black/90">
              {{ datosParque().politicasSeguridad }}
            </p>
            <p class="font-bold text-[9.5px] pt-1">
              {{ datosParque().mensajePie }}
            </p>
          </footer>
        </article>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .ticket-print-root {
      margin: 0 auto;
      background: #ffffff;
      color: #000000;
    }

    /* Formato de Rollo Térmico 80mm */
    .print-roll-80mm {
      width: 80mm;
      max-width: 80mm;
      padding: 3mm 4mm;
      font-size: 11px;
    }

    /* Formato de Rollo Térmico 58mm */
    .print-roll-58mm {
      width: 58mm;
      max-width: 58mm;
      padding: 2mm 2.5mm;
      font-size: 9.5px;
    }

    .ticket-thermal-sheet {
      background: #ffffff;
      color: #000000;
      padding-bottom: 6mm;
      margin-bottom: 6mm;
      page-break-after: always;
      break-after: page;
    }

    .ticket-thermal-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
      margin-bottom: 0;
      padding-bottom: 2mm;
    }

    @media print {
      .ticket-print-root {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .print-roll-80mm {
        max-width: 80mm !important;
        width: 80mm !important;
      }

      .print-roll-58mm {
        max-width: 58mm !important;
        width: 58mm !important;
      }

      .ticket-thermal-sheet {
        page-break-after: always !important;
        break-after: page !important;
      }

      .ticket-thermal-sheet:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
  `]
})
export class TicketPrintTemplateComponent {
  private readonly _orden = signal<OrdenEmisionFisica | null>(null);
  private readonly _boletas = signal<Ticket[]>([]);
  private readonly _paperWidthMm = signal<58 | 80>(80);
  private readonly _config = signal<Partial<ConfiguracionParque> | null>(null);

  @Input()
  set orden(val: OrdenEmisionFisica | null) {
    this._orden.set(val);
  }
  get orden(): OrdenEmisionFisica | null {
    return this._orden();
  }

  @Input()
  set boletas(val: Ticket[]) {
    this._boletas.set(val || []);
  }
  get boletas(): Ticket[] {
    return this._boletas();
  }

  @Input()
  set paperWidthMm(val: 58 | 80) {
    this._paperWidthMm.set(val === 58 ? 58 : 80);
  }
  get paperWidthMm(): 58 | 80 {
    return this._paperWidthMm();
  }

  @Input()
  set config(val: Partial<ConfiguracionParque> | null) {
    this._config.set(val);
  }
  get config(): Partial<ConfiguracionParque> | null {
    return this._config();
  }

  readonly boletasEfectivas = computed<Ticket[]>(() => {
    const b = this._boletas();
    if (b && b.length > 0) {
      return b;
    }
    return this._orden()?.boletas ?? [];
  });

  readonly datosParque = computed(() => {
    const c = this._config();
    return {
      nombreComercial: c?.nombreComercial || 'Territorio de Niños',
      razonSocial: c?.razonSocial || 'Territorio de Niños S.A.S.',
      nit: c?.nit || '901.458.789-2',
      direccion: c?.direccion || 'Av. Bolívar # 14N-55',
      telefono: c?.telefono || '3104567890',
      ciudad: c?.ciudad || 'Armenia, Quindío',
      politicasSeguridad:
        c?.politicasSeguridad ||
        'Uso obligatorio de medias antideslizantes. Menores bajo supervisión de un adulto responsable. Prohibido alimentos en atracciones.',
      mensajePie: c?.mensajePie || '¡Gracias por su visita a Territorio de Niños!'
    };
  });

  formatearFecha(fecha?: Date | string | null): string {
    const f = fecha ? new Date(fecha) : new Date();
    if (isNaN(f.getTime())) {
      return new Date().toLocaleDateString('es-CO');
    }
    return f.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
