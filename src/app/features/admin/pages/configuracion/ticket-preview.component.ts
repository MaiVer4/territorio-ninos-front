import { Component, Input, OnChanges, OnInit, SimpleChanges, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as QRCode from 'qrcode';
import { ConfiguracionParque } from '../../../../core/models/configuracion.model';
import { TicketPrintTemplateComponent } from '../../../../shared/components/ticket-print-template/ticket-print-template.component';

@Component({
  selector: 'app-ticket-preview',
  standalone: true,
  imports: [CommonModule, TicketPrintTemplateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center">
      <!-- Selector de Ancho de Papel -->
      <div class="flex items-center gap-2 mb-3 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
        <button type="button" (click)="setPaperWidth(58)"
          [class]="paperWidth() === 58 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer">
          58 mm (Estrecho)
        </button>
        <button type="button" (click)="setPaperWidth(80)"
          [class]="paperWidth() === 80 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer">
          80 mm (Estándar POS)
        </button>
      </div>

      <!-- Plantilla Unificada Compartida con Taquilla POS -->
      <app-ticket-print-template
        [modoPreview]="true"
        [paperWidthMm]="paperWidth()"
        [config]="config">
      </app-ticket-print-template>
    </div>
  `
})
export class TicketPreviewComponent implements OnInit, OnChanges {
  @Input() config: ConfiguracionParque | null = null;

  readonly paperWidth = signal<58 | 80>(80);
  readonly qrDataUrl = signal<string>('');
  readonly fechaHora = signal<string>('Hoy, ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));

  ngOnInit() {
    this.generateDemoQR();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config'] && this.config?.anchoPapelMm) {
      this.paperWidth.set(this.config.anchoPapelMm);
    }
  }

  setPaperWidth(w: 58 | 80) {
    this.paperWidth.set(w);
  }

  async generateDemoQR() {
    if (this.qrDataUrl()) return;
    try {
      const url = await QRCode.toDataURL('TDN-DEMO-TICKET-2026', {
        width: 120,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      });
      this.qrDataUrl.set(url);
    } catch {
      this.qrDataUrl.set('');
    }
  }
}
