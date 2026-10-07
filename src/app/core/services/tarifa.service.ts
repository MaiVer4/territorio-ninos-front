import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TarifaBloque, TarifaEvento, TarifarioAtraccion } from '../models/tarifa.model';

@Injectable({
  providedIn: 'root'
})
export class TarifaService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/tarifas`;

  getTarifasByAtraccion(atraccionId: number | string): Observable<TarifarioAtraccion> {
    return this.http.get<TarifarioAtraccion>(`${this.apiUrl}/atraccion/${atraccionId}`);
  }

  saveTarifaBloque(tarifa: TarifaBloque): Observable<TarifaBloque> {
    if (tarifa.id) {
      return this.http.put<TarifaBloque>(`${this.apiUrl}/bloques/${tarifa.id}`, tarifa);
    }
    return this.http.post<TarifaBloque>(`${this.apiUrl}/bloques`, tarifa);
  }

  saveTarifaEvento(tarifa: TarifaEvento): Observable<TarifaEvento> {
    if (tarifa.id) {
      return this.http.put<TarifaEvento>(`${this.apiUrl}/eventos/${tarifa.id}`, tarifa);
    }
    return this.http.post<TarifaEvento>(`${this.apiUrl}/eventos`, tarifa);
  }

  deleteTarifaBloque(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/bloques/${id}`);
  }

  deleteTarifaEvento(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/eventos/${id}`);
  }
}
