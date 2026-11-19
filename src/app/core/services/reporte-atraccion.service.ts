import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EstadoReporteAtraccion,
  ReporteAtraccion,
  ReporteAtraccionEstadoRequest,
  ReporteAtraccionRequest,
  TipoReporteAtraccion
} from '../models/reporte-atraccion.model';

@Injectable({
  providedIn: 'root'
})
export class ReporteAtraccionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/reportes-atraccion`;

  listar(filtros?: {
    atraccionId?: number | null;
    tipoReporte?: TipoReporteAtraccion | null;
    estado?: EstadoReporteAtraccion | null;
  }): Observable<ReporteAtraccion[]> {
    let params = new HttpParams();
    if (filtros?.atraccionId) {
      params = params.set('atraccionId', String(filtros.atraccionId));
    }
    if (filtros?.tipoReporte) {
      params = params.set('tipoReporte', filtros.tipoReporte);
    }
    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<ReporteAtraccion[]>(this.apiUrl, { params });
  }

  crear(request: ReporteAtraccionRequest): Observable<ReporteAtraccion> {
    return this.http.post<ReporteAtraccion>(this.apiUrl, request);
  }

  actualizarEstado(id: number, request: ReporteAtraccionEstadoRequest): Observable<ReporteAtraccion> {
    return this.http.patch<ReporteAtraccion>(`${this.apiUrl}/${id}/estado`, request);
  }
}
