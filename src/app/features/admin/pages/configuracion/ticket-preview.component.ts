import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as QRCode from 'qrcode';
import { ConfiguracionParque } from '../../../../core/models/configuracion.model';

@Component({
  selector: 'app-ticket-preview',
  standalone: true,
  imports: [CommonModule],
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

      <!-- Tira de Boleta Térmica Simulada -->
      <div class="bg-white text-slate-900 border border-slate-200 rounded-t-lg shadow-xl p-4 font-mono transition-all duration-300 relative select-none"
        [style.width.px]="paperWidth() === 58 ? 260 : 330"
        style="min-height: 440px;">
        
        <!-- Efecto corte superior de papel -->
        <div class="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
          <div class="w-8 h-8 mx-auto bg-slate-900 text-white rounded-lg flex items-center justify-center text-xs font-bold mb-1.5">
            TDN
          </div>
          <h4 class="font-extrabold text-sm uppercase tracking-wide leading-tight">
            {{ config?.nombreComercial || 'Territorio de Niños' }}
          </h4>
          <p class="text-[10px] text-slate-600 mt-0.5">
            {{ config?.razonSocial || 'Territorio de Niños S.A.S.' }}
          </p>
          <p class="text-[10px] text-slate-600">NIT: {{ config?.nit || '901.458.789-2' }}</p>
          <p class="text-[10px] text-slate-600">{{ config?.direccion || 'Av. Bolívar # 14N-55' }}</p>
          <p class="text-[10px] text-slate-600">{{ config?.ciudad || 'Armenia, Quindío' }} · Tel: {{ config?.telefono || '3104567890' }}</p>
        </div>

        <!-- Metadata de Boleta de Demostración -->
        <div class="text-[10px] space-y-0.5 border-b border-dashed border-slate-300 pb-2 mb-2 text-slate-700">
          <div class="flex justify-between">
            <span>TIQUETE: #10842</span>
            <span>CAJA: 01</span>
          </div>
          <div class="flex justify-between">
            <span>FECHA: {{ fechaHora() }}</span>
          </div>
          <div class="flex justify-between">
            <span>CLIENTE: Acudiente Demo</span>
          </div>
          <div class="flex justify-between">
            <span>MENOR: Mateo (6 años)</span>
          </div>
        </div>

        <!-- Detalle de Atracción de Ejemplo -->
        <div class="text-[10px] space-y-1 border-b border-dashed border-slate-300 pb-2 mb-3">
          <div class="flex justify-between font-bold text-slate-800">
            <span>PISCINA DE PELOTAS</span>
            <span>$15.000</span>
          </div>
          <div class="flex justify-between text-slate-500">
            <span>Tiempo: 30 minutos</span>
            <span>Cant: 1</span>
          </div>
          <div class="flex justify-between font-extrabold text-xs pt-1 border-t border-dotted border-slate-200">
            <span>TOTAL PAGADO</span>
            <span>$15.000 COP</span>
          </div>
        </div>

        <!-- Renderizado de Código QR para Acceso Rápido -->
        <div class="flex flex-col items-center justify-center my-2">
          @if (qrDataUrl()) {
            <img [src]="qrDataUrl()" alt="Código QR Tiquete" class="w-24 h-24 border border-slate-200 rounded p-1 bg-white" />
          } @else {
            <div class="w-24 h-24 bg-slate-100 flex items-center justify-center text-[9px] text-slate-400 text-center p-2 rounded">
              Generando QR...
            </div>
          }
          <span class="text-[9px] text-slate-500 mt-1 tracking-widest font-bold">UUID-TDN-2026-DEMO</span>
        </div>

        <!-- Términos y Recomendaciones de Seguridad (HU-13) -->
        <div class="border-t border-dashed border-slate-300 pt-2 mt-2 text-center text-[9px] leading-tight text-slate-600">
          <p class="font-bold mb-1 uppercase tracking-wider">Normas de Seguridad</p>
          <p class="whitespace-pre-line text-justify">
            {{ config?.politicasSeguridad || 'Uso obligatorio de medias antideslizantes. Prohibido el ingreso de alimentos y bebidas a las zonas de juego. El parque no se hace responsable por objetos perdidos.' }}
          </p>
          <p class="font-bold mt-2 text-slate-800 text-[10px]">
            {{ config?.mensajePie || '¡Gracias por su visita a Territorio de Niños!' }}
          </p>
        </div>

        <!-- Dientes de corte de papel (CSS Sawtooth) -->
        <div class="absolute -bottom-2 left-0 right-0 h-2 bg-transparent overflow-hidden flex">
          @for (item of teeth; track $index) {
            <div class="w-2.5 h-2.5 bg-white transform rotate-45 -translate-y-1.5 shrink-0 border-r border-b border-slate-200"></div>
          }
        </div>
      </div>
    </div>
  `
})
export class TicketPreviewComponent implements OnChanges {
  @Input() config: ConfiguracionParque | null = null;

  paperWidth = signal<58 | 80>(80);
  qrDataUrl = signal<string>('');
  fechaHora = signal<string>('Hoy, ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));

  teeth = Array.from({ length: 35 });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config'] && this.config?.anchoPapelMm) {
      this.paperWidth.set(this.config.anchoPapelMm);
    }
    this.generateDemoQR();
  }

  setPaperWidth(w: 58 | 80) {
    this.paperWidth.set(w);
  }

  async generateDemoQR() {
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
