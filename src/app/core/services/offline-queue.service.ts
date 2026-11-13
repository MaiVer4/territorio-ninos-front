import { Injectable, signal, computed } from '@angular/core';
import { AccionOfflinePendiente, TipoAccionOffline } from '../models/operador.model';
import { from, Observable, of } from 'rxjs';
import { concatMap, catchError, map, toArray } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class OfflineQueueService {
  private readonly STORAGE_KEY = 'tdn_operario_offline_queue_v1';
  readonly MAX_REINTENTOS = 5;

  readonly accionesPendientes = signal<AccionOfflinePendiente[]>([]);
  readonly accionesDescartadas = signal<AccionOfflinePendiente[]>([]);
  readonly totalPendientes = computed<number>(() => this.accionesPendientes().length);
  readonly hayAccionesPendientes = computed<boolean>(() => this.accionesPendientes().length > 0);

  constructor() {
    this.cargarDesdeStorage();
  }

  /**
   * Encola una acción operativa realizada en modo offline (HU-35.06).
   */
  encolarAccion(
    tipo: TipoAccionOffline,
    atraccionId: number | string,
    payload: Record<string, unknown> = {},
    idSesion?: string,
    ticketUuid?: string
  ): AccionOfflinePendiente {
    const nuevaAccion: AccionOfflinePendiente = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tipo,
      atraccionId,
      idSesion,
      ticketUuid,
      payload,
      timestamp: new Date().toISOString(),
      reintentos: 0
    };

    this.accionesPendientes.update(lista => {
      const nuevaLista = [...lista, nuevaAccion];
      this.guardarEnStorage(nuevaLista);
      return nuevaLista;
    });

    return nuevaAccion;
  }

  removerAccion(id: string): void {
    this.accionesPendientes.update(lista => {
      const filtrada = lista.filter(a => a.id !== id);
      this.guardarEnStorage(filtrada);
      return filtrada;
    });
  }

  limpiarCola(): void {
    this.accionesPendientes.set([]);
    this.guardarEnStorage([]);
  }

  /**
   * Procesa secuencialmente las acciones encoladas contra un ejecutor (ej. peticiones HTTP).
   */
  sincronizarColaPendiente(
    ejecutor: (accion: AccionOfflinePendiente) => Observable<unknown>
  ): Observable<{ procesadas: number; fallidas: number }> {
    const listaActual = [...this.accionesPendientes()];
    if (listaActual.length === 0) {
      return of({ procesadas: 0, fallidas: 0 });
    }

    let procesadas = 0;
    let fallidas = 0;

    return from(listaActual).pipe(
      concatMap(accion => {
        return ejecutor(accion).pipe(
          map(() => {
            this.removerAccion(accion.id);
            procesadas++;
            return true;
          }),
          catchError((err: unknown) => {
            const status = typeof err === 'object' && err !== null && 'status' in err
              ? Number((err as { status?: number }).status)
              : 0;
            const esErrorPermanente4xx = status >= 400 && status < 500 && status !== 408 && status !== 429;
            const nuevosReintentos = accion.reintentos + 1;

            if (esErrorPermanente4xx || nuevosReintentos >= this.MAX_REINTENTOS) {
              const descartada: AccionOfflinePendiente = { ...accion, reintentos: nuevosReintentos };
              this.accionesDescartadas.update(prev => [...prev, descartada]);
              this.removerAccion(accion.id);
            } else {
              this.accionesPendientes.update(lista => {
                const actualizada = lista.map(a => (a.id === accion.id ? { ...a, reintentos: nuevosReintentos } : a));
                this.guardarEnStorage(actualizada);
                return actualizada;
              });
            }
            fallidas++;
            return of(false);
          })
        );
      }),
      toArray(),
      map(() => ({ procesadas, fallidas }))
    );
  }

  private cargarDesdeStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const serializado = localStorage.getItem(this.STORAGE_KEY);
      if (serializado) {
        const datos = JSON.parse(serializado) as AccionOfflinePendiente[];
        if (Array.isArray(datos)) {
          this.accionesPendientes.set(datos);
        }
      }
    } catch {
      // Ignorar errores al leer localStorage
    }
  }

  private guardarEnStorage(lista: AccionOfflinePendiente[]): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(lista));
    } catch {
      // Ignorar
    }
  }
}
