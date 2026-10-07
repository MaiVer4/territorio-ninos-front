import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Atraccion } from '../models/atraccion.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AtraccionService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/atracciones`;

  getAll(): Observable<Atraccion[]> {
    return this.http.get<Atraccion[]>(this.apiUrl);
  }

  getById(id: number): Observable<Atraccion> {
    return this.http.get<Atraccion>(`${this.apiUrl}/${id}`);
  }

  create(atraccion: Atraccion): Observable<Atraccion> {
    return this.http.post<Atraccion>(this.apiUrl, atraccion);
  }

  update(id: number, atraccion: Atraccion): Observable<Atraccion> {
    return this.http.put<Atraccion>(`${this.apiUrl}/${id}`, atraccion);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateTolerance(id: number | string, toleranciaMinutos: number): Observable<Atraccion> {
    return this.http.put<Atraccion>(`${this.apiUrl}/${id}/tolerancia`, { toleranciaMinutos });
  }
}
