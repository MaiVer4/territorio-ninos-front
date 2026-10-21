import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  TurnoCaja,
  TurnoResponseDTO,
  AperturaTurnoDTO,
  CierreTurnoDTO,
  ResultadoArqueoDTO
} from '../models/caja.model';

@Injectable({
  providedIn: 'root'
})
export class CajaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/turnos`;

  // Estado reactivo del turno actual en memoria
  public readonly turnoActual = signal<TurnoResponseDTO | null>(null);

  /**
   * Obtiene el turno activo del cajero en sesión
   */
  obtenerTurnoActivo(): Observable<TurnoResponseDTO | null> {
    return this.http.get<TurnoResponseDTO>(`${this.apiUrl}/activo`).pipe(
      tap(turno => this.turnoActual.set(turno)),
      catchError(() => {
        this.turnoActual.set(null);
        return of(null);
      })
    );
  }

  /**
   * Verifica si el cajero tiene un turno abierto actualmente
   */
  verificarCajaAbierta(): Observable<boolean> {
    return this.obtenerTurnoActivo().pipe(
      map(turno => !!turno && turno.estado === 'ABIERTO')
    );
  }

  /**
   * Registra la apertura de turno de caja
   */
  abrirTurno(data: AperturaTurnoDTO): Observable<TurnoResponseDTO> {
    return this.http.post<TurnoResponseDTO>(`${this.apiUrl}/abrir`, data).pipe(
      tap(turno => this.turnoActual.set(turno))
    );
  }

  /**
   * Registra el cierre de turno de caja
   */
  cerrarTurno(data: CierreTurnoDTO): Observable<TurnoResponseDTO> {
    return this.http.post<TurnoResponseDTO>(`${this.apiUrl}/cerrar`, data).pipe(
      tap(() => this.turnoActual.set(null))
    );
  }

  /**
   * Registra el arqueo físico de caja para un turno
   */
  registrarArqueo(idTurno: number, data: ResultadoArqueoDTO): Observable<ResultadoArqueoDTO> {
    return this.http.post<ResultadoArqueoDTO>(`${this.apiUrl}/${idTurno}/arqueo`, data);
  }

  /**
   * Consulta el historial de turnos, opcionalmente filtrado por fecha
   */
  getHistorial(fecha?: string): Observable<TurnoCaja[]> {
    let params = new HttpParams();
    if (fecha) {
      params = params.set('fecha', fecha);
    }
    return this.http.get<TurnoCaja[]>(this.apiUrl, { params });
  }

  /**
   * Limpia el estado reactivo del turno en memoria
   */
  limpiarEstado(): void {
    this.turnoActual.set(null);
  }
}
