import { TestBed } from '@angular/core/testing';
import { WebSocketService, OccupancyEvent } from './websocket.service';

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WebSocketService]
    });
    service = TestBed.inject(WebSocketService);
  });

  it('should be created and default to connected signal true', () => {
    expect(service).toBeTruthy();
    expect(service.connected()).toBe(true);
  });

  it('should update connected signal when setConnected is called', () => {
    service.setConnected(false);
    expect(service.connected()).toBe(false);

    service.setConnected(true);
    expect(service.connected()).toBe(true);
  });

  it('should stream occupancy events through occupancy$', () => {
    const mockEvent: OccupancyEvent = {
      atraccionId: 3,
      ninosActivos: 7,
      operarioNombre: 'Carlos Operario',
      capacidadMaxima: 10
    };

    let received: OccupancyEvent | null = null;
    service.occupancy$.subscribe(ev => {
      received = ev;
    });

    service.emitOccupancyEvent(mockEvent);

    expect(received).toEqual(mockEvent);
  });
});
