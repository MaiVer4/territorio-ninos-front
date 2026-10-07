import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AsignacionOperario } from '../models/asignacion.model';

@Injectable({
  providedIn: 'root'
})
export class AsignacionService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/asignaciones`;

  getActiveAssignments(): Observable<AsignacionOperario[]> {
    return this.http.get<AsignacionOperario[]>(`${this.apiUrl}/activas`);
  }

  assignOperator(atraccionId: number | string, operarioId: number | string, forzarReasignacion = false): Observable<AsignacionOperario> {
    return this.http.post<AsignacionOperario>(this.apiUrl, {
      atraccionId,
      operarioId,
      forzarReasignacion
    });
  }

  releaseAssignment(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
