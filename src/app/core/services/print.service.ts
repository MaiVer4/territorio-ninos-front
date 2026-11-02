import { Injectable, signal } from '@angular/core';
import { OrdenEmisionFisica } from '../models/atraccion.model';
import { Ticket } from '../models/ticket.model';
import { ConfiguracionParque } from '../models/configuracion.model';

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  readonly imprimiendo = signal<boolean>(false);
  readonly ordenEnImpresion = signal<OrdenEmisionFisica | null>(null);
  readonly boletasEnImpresion = signal<Ticket[]>([]);
  readonly anchoPapelMm = signal<58 | 80>(80);
  readonly configParque = signal<Partial<ConfiguracionParque> | null>(null);
  readonly totalImpresionesSesion = signal<number>(0);

  /**
   * Configura el formato de ancho de rollo térmico (80mm estándar POS o 58mm estrecho).
   */
  configurarAnchoPapel(ancho: 58 | 80): void {
    this.anchoPapelMm.set(ancho);
  }

  /**
   * Configura los datos fiscales y encabezado/pie del parque para los tiquetes impresos.
   */
  configurarDatosParque(config: Partial<ConfiguracionParque>): void {
    this.configParque.set(config);
  }

  /**
   * Carga una orden completa y dispara el comando de impresión nativo del navegador (HU-21.05 / HU-21.06).
   */
  imprimirOrden(orden: OrdenEmisionFisica, anchoPapel?: 58 | 80): boolean {
    if (anchoPapel) {
      this.anchoPapelMm.set(anchoPapel);
    }
    this.ordenEnImpresion.set(orden);
    this.boletasEnImpresion.set(orden.boletas ?? []);
    return this.ejecutarWindowPrint();
  }

  /**
   * Imprime un listado específico de boletas individuales.
   */
  imprimirBoletas(boletas: Ticket[], orden?: OrdenEmisionFisica | null, anchoPapel?: 58 | 80): boolean {
    if (anchoPapel) {
      this.anchoPapelMm.set(anchoPapel);
    }
    this.ordenEnImpresion.set(orden ?? null);
    this.boletasEnImpresion.set(boletas);
    return this.ejecutarWindowPrint();
  }

  /**
   * Dispara el diálogo de impresión nativo mediante window.print() (SCRUM-376 / HU-21.05 / Notion: CA-04).
   */
  ejecutarWindowPrint(): boolean {
    if (typeof window === 'undefined' || typeof window.print !== 'function') {
      return false;
    }

    this.imprimiendo.set(true);
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('pos-printing-active');
    }

    try {
      window.print();
      this.totalImpresionesSesion.update(c => c + 1);
      return true;
    } catch {
      return false;
    } finally {
      this.imprimiendo.set(false);
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.remove('pos-printing-active');
      }
    }
  }
}
