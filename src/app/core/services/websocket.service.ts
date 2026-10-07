import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface OccupancyEvent {
  atraccionId: number | string;
  ninosActivos: number;
  operarioNombre?: string;
  capacidadMaxima?: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private occupancySubject = new Subject<OccupancyEvent>();
  public occupancy$: Observable<OccupancyEvent> = this.occupancySubject.asObservable();

  connected = signal(true);

  constructor() {
    // Inicialización del canal reactivo
  }

  emitOccupancyEvent(event: OccupancyEvent) {
    this.occupancySubject.next(event);
  }

  setConnected(status: boolean) {
    this.connected.set(status);
  }
}
