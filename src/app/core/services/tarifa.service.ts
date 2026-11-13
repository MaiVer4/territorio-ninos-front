import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TarifaBloque, TarifaEvento, TarifarioAtraccion } from '../models/tarifa.model';

@Injectable({
  providedIn: 'root'
})
export class TarifaService {
  private http = inject(HttpClient);
  private readonly tiempoApiUrl = `${environment.apiUrl}/tarifas-tiempo`;
  private readonly eventoApiUrl = `${environment.apiUrl}/tarifas-evento`;

  getTarifasByAtraccion(atraccionId: number | string): Observable<TarifarioAtraccion> {
    return forkJoin({
      bloques: this.http.get<TarifaBloque[]>(`${this.tiempoApiUrl}/atraccion/${atraccionId}`).pipe(catchError(() => of([]))),
      eventos: this.http.get<TarifaEvento[]>(`${this.eventoApiUrl}/atraccion/${atraccionId}`).pipe(catchError(() => of([])))
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
    if (tarifa.id) {
      return this.http.put<TarifaBloque>(`${this.tiempoApiUrl}/${tarifa.id}`, tarifa);
    }
    return this.http.post<TarifaBloque>(this.tiempoApiUrl, tarifa);
  }

  saveTarifaEvento(tarifa: TarifaEvento): Observable<TarifaEvento> {
    if (tarifa.id) {
      return this.http.put<TarifaEvento>(`${this.eventoApiUrl}/${tarifa.id}`, tarifa);
    }
    return this.http.post<TarifaEvento>(this.eventoApiUrl, tarifa);
  }

  deleteTarifaBloque(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.tiempoApiUrl}/${id}`);
  }

  deleteTarifaEvento(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.eventoApiUrl}/${id}`);
  }
}
