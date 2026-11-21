import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CatalogoAtraccionOnline,
  CompraOnlineRequest,
  CompraOnlineResponse,
  ItemCarritoOnline,
  TicketOnline
} from '../models/tienda.model';

const STORAGE_KEY_BOLETOS = 'tdn_boletos_recientes';
const STORAGE_KEY_ORDEN = 'tdn_ultima_orden';

@Injectable({
  providedIn: 'root'
})
export class TiendaService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tienda`;

  // Signals reactivos para el catálogo
  readonly catalogo = signal<CatalogoAtraccionOnline[]>([]);
  readonly cargandoCatalogo = signal<boolean>(false);
  readonly errorCatalogo = signal<string | null>(null);

  // Signals reactivos para el carrito
  readonly carrito = signal<ItemCarritoOnline[]>([]);
  readonly carritoAbierto = signal<boolean>(false);

  // Signals para la orden activa o recién comprada
  readonly ordenReciente = signal<CompraOnlineResponse | null>(null);
  readonly boletosLocales = signal<TicketOnline[]>([]);

  // Cálculos reactivos de la cesta
  readonly totalItems = computed(() =>
    this.carrito().reduce((acc, item) => acc + item.cantidad, 0)
  );

  readonly subtotal = computed(() =>
    this.carrito().reduce((acc, item) => acc + item.subtotal, 0)
  );

  // Impuesto estimado (19% IVA estándar para referencia visual en carrito)
  readonly impuestosEstimados = computed(() =>
    Math.round(this.subtotal() * 0.19)
  );

  readonly totalPagar = computed(() =>
    this.subtotal() + this.impuestosEstimados()
  );

  constructor() {
    this.cargarBoletosDesdeStorage();
  }

  /**
   * Consulta el catálogo de atracciones activas con sus tarifas vigentes desde el backend
   */
  obtenerCatalogo(): Observable<CatalogoAtraccionOnline[]> {
    this.cargandoCatalogo.set(true);
    this.errorCatalogo.set(null);
    return this.http.get<CatalogoAtraccionOnline[]>(`${this.baseUrl}/catalogo`).pipe(
      tap({
        next: (items) => {
          this.catalogo.set(items);
          this.cargandoCatalogo.set(false);
        },
        error: (err) => {
          this.errorCatalogo.set(
            err.error?.detalles || err.error?.mensaje || 'Error al cargar las atracciones disponibles'
          );
          this.cargandoCatalogo.set(false);
        }
      })
    );
  }

  /**
   * Agrega un nuevo ítem de boleto configurado al carrito
   */
  agregarAlCarrito(item: ItemCarritoOnline): void {
    this.carrito.update((actual) => [...actual, item]);
  }

  /**
   * Elimina un ítem del carrito por su ID temporal
   */
  eliminarDelCarrito(id: string): void {
    this.carrito.update((actual) => actual.filter((it) => it.id !== id));
  }

  /**
   * Actualiza la cantidad de un ítem en el carrito
   */
  actualizarCantidad(id: string, delta: number): void {
    this.carrito.update((actual) =>
      actual
        .map((it) => {
          if (it.id === id) {
            const nuevaCantidad = it.cantidad + delta;
            if (nuevaCantidad <= 0) return null;
            return {
              ...it,
              cantidad: nuevaCantidad,
              subtotal: nuevaCantidad * it.precioUnitario
            };
          }
          return it;
        })
        .filter((it): it is ItemCarritoOnline => it !== null)
    );
  }

  /**
   * Vacía todos los ítems del carrito
   */
  limpiarCarrito(): void {
    this.carrito.set([]);
  }

  /**
   * Control visual del drawer del carrito
   */
  abrirCarrito(): void {
    this.carritoAbierto.set(true);
  }

  cerrarCarrito(): void {
    this.carritoAbierto.set(false);
  }

  /**
   * Envía la solicitud de compra al backend público
   */
  procesarCompra(req: CompraOnlineRequest): Observable<CompraOnlineResponse> {
    return this.http.post<CompraOnlineResponse>(`${this.baseUrl}/comprar`, req).pipe(
      tap((res) => {
        this.ordenReciente.set(res);
        this.guardarBoletosEnStorage(res.boletas, res);
        this.limpiarCarrito();
        this.cerrarCarrito();
      })
    );
  }

  /**
   * Consulta los boletos vigentes del día por documento o email del acudiente
   */
  consultarBoletos(identificador: string): Observable<TicketOnline[]> {
    const params = new HttpParams().set('identificador', identificador.trim());
    return this.http.get<TicketOnline[]>(`${this.baseUrl}/mis-boletos`, { params }).pipe(
      tap((boletos) => {
        if (boletos && boletos.length > 0) {
          this.boletosLocales.set(boletos);
        }
      })
    );
  }

  /**
   * Carga boletos persistidos previamente en el navegador
   */
  private cargarBoletosDesdeStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const guardados = localStorage.getItem(STORAGE_KEY_BOLETOS);
      if (guardados) {
        const boletos = JSON.parse(guardados);
        if (Array.isArray(boletos)) {
          this.boletosLocales.set(boletos);
        }
      }
      const ordenRaw = localStorage.getItem(STORAGE_KEY_ORDEN);
      if (ordenRaw) {
        this.ordenReciente.set(JSON.parse(ordenRaw));
      }
    } catch {
      // Ignorar errores de parseo en almacenamiento local
    }
  }

  /**
   * Guarda boletos en localStorage para acceso inmediato sin red
   */
  guardarBoletosEnStorage(boletos: TicketOnline[], orden?: CompraOnlineResponse): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(STORAGE_KEY_BOLETOS, JSON.stringify(boletos));
      if (orden) {
        localStorage.setItem(STORAGE_KEY_ORDEN, JSON.stringify(orden));
      }
      this.boletosLocales.set(boletos);
    } catch {
      // Ignorar quota errors
    }
  }
}
