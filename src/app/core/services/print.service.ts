import { ApplicationRef, Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { OrdenEmisionFisica } from '../models/atraccion.model';
import { Ticket } from '../models/ticket.model';
import { ConfiguracionParque, CONFIG_PARQUE_DEFAULT } from '../models/configuracion.model';
import { ConfiguracionService } from './configuracion.service';

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  private readonly configuracionService = inject(ConfiguracionService, { optional: true });
  private readonly appRef = inject(ApplicationRef, { optional: true });

  readonly imprimiendo = signal<boolean>(false);
  readonly ordenEnImpresion = signal<OrdenEmisionFisica | null>(null);
  readonly boletasEnImpresion = signal<Ticket[]>([]);
  readonly anchoPapelMm = signal<58 | 80>(80);
  readonly configParque = signal<Partial<ConfiguracionParque> | null>(CONFIG_PARQUE_DEFAULT);
  readonly totalImpresionesSesion = signal<number>(0);

  /**
   * Refresca la configuración del parque desde el backend si está disponible.
   */
  refrescarConfiguracion(): Observable<ConfiguracionParque | null> {
    if (!this.configuracionService) {
      return of(this.configParque() as ConfiguracionParque | null);
    }
    return this.configuracionService.getConfiguracion().pipe(
      tap(cfg => {
        if (cfg) {
          this.configurarDatosParque(cfg);
          if (cfg.anchoPapelMm) {
            this.configurarAnchoPapel(cfg.anchoPapelMm);
          }
        }
      }),
      catchError(() => of(this.configParque() as ConfiguracionParque | null))
    );
  }

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
    this.configParque.update(prev => ({
      ...(prev || CONFIG_PARQUE_DEFAULT),
      ...config
    }));
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

    // Forzar sincronización inmediata del DOM de Angular antes de que window.print() congele el hilo principal
    try {
      this.appRef?.tick();
    } catch {
      // Ignorar si ya hay un ciclo de detección en curso en pruebas unitarias
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
