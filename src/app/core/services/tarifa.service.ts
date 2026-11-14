import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TarifaBloque, TarifaEvento, TarifarioAtraccion } from '../models/tarifa.model';

export interface TarifaTiempoBackendDTO {
  id?: number | string;
  atraccionId: number | string;
  duracionMinutos?: number;
  minutos?: number;
  precio: number;
  activo?: boolean;
  vigente?: boolean;
}

export interface TarifaEventoBackendDTO {
  id?: number | string;
  atraccionId: number | string;
  intentos: number;
  precio: number;
  descripcion?: string;
  activo?: boolean;
  vigente?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TarifaService {
  private http = inject(HttpClient);
  private readonly tiempoApiUrl = `${environment.apiUrl}/tarifas-tiempo`;
  private readonly eventoApiUrl = `${environment.apiUrl}/tarifas-evento`;

  getTarifasByAtraccion(atraccionId: number | string): Observable<TarifarioAtraccion> {
    return forkJoin({
      bloques: this.http.get<TarifaTiempoBackendDTO[]>(`${this.tiempoApiUrl}/atraccion/${atraccionId}`).pipe(
        map(items => (items || []).map(item => this.mapToTarifaBloque(item))),
        catchError(() => of([]))
      ),
      eventos: this.http.get<TarifaEventoBackendDTO[]>(`${this.eventoApiUrl}/atraccion/${atraccionId}`).pipe(
        map(items => (items || []).map(item => this.mapToTarifaEvento(item))),
        catchError(() => of([]))
      )
    }).pipe(
      map(({ bloques, eventos }) => ({
        atraccionId,
        nombreAtraccion: '',
        tipo: eventos.length > 0 && bloques.length === 0 ? 'EVENTOS_CAIDAS' : 'TEMPORIZADA',
        bloques: bloques || [],
        eventos: eventos || []
      }))
    );
  }

  saveTarifaBloque(tarifa: TarifaBloque): Observable<TarifaBloque> {
    const payload = {
      atraccionId: Number(tarifa.atraccionId),
      duracionMinutos: Number(tarifa.minutos),
      precio: Number(tarifa.precio),
      activo: tarifa.vigente ?? true
    };
    if (tarifa.id) {
      return this.http.put<TarifaTiempoBackendDTO>(`${this.tiempoApiUrl}/${tarifa.id}`, payload).pipe(
        map(res => this.mapToTarifaBloque(res))
      );
    }
    return this.http.post<TarifaTiempoBackendDTO>(this.tiempoApiUrl, payload).pipe(
      map(res => this.mapToTarifaBloque(res))
    );
  }

  saveTarifaEvento(tarifa: TarifaEvento): Observable<TarifaEvento> {
    const payload = {
      atraccionId: Number(tarifa.atraccionId),
      intentos: Number(tarifa.intentos),
      precio: Number(tarifa.precio),
      activo: tarifa.vigente ?? true
    };
    if (tarifa.id) {
      return this.http.put<TarifaEventoBackendDTO>(`${this.eventoApiUrl}/${tarifa.id}`, payload).pipe(
        map(res => this.mapToTarifaEvento({ ...tarifa, ...res }))
      );
    }
    return this.http.post<TarifaEventoBackendDTO>(this.eventoApiUrl, payload).pipe(
      map(res => this.mapToTarifaEvento({ ...tarifa, ...res }))
    );
  }

  deleteTarifaBloque(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.tiempoApiUrl}/${id}`);
  }

  deleteTarifaEvento(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.eventoApiUrl}/${id}`);
  }

  private mapToTarifaBloque(raw: TarifaTiempoBackendDTO): TarifaBloque {
    return {
      id: raw.id,
      atraccionId: raw.atraccionId,
      minutos: raw.duracionMinutos ?? raw.minutos ?? 0,
      precio: raw.precio,
      vigente: raw.activo ?? raw.vigente ?? true
    };
  }

  private mapToTarifaEvento(raw: TarifaEventoBackendDTO): TarifaEvento {
    return {
      id: raw.id,
      atraccionId: raw.atraccionId,
      intentos: raw.intentos,
      precio: raw.precio,
      descripcion: raw.descripcion ?? `Paquete estándar ${raw.intentos} caídas`,
      vigente: raw.activo ?? raw.vigente ?? true
    };
  }
}
