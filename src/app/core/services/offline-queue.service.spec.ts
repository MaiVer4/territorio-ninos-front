import { TestBed } from '@angular/core/testing';
import { OfflineQueueService } from './offline-queue.service';
import { of, throwError } from 'rxjs';

describe('OfflineQueueService (HU-35.06)', () => {
  let service: OfflineQueueService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [OfflineQueueService]
    });
    service = TestBed.inject(OfflineQueueService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with empty queue', () => {
    expect(service.accionesPendientes()).toEqual([]);
    expect(service.totalPendientes()).toBe(0);
    expect(service.hayAccionesPendientes()).toBe(false);
  });

  it('should enqueue actions and persist them', () => {
    const accion = service.encolarAccion(
      'CONFIRMAR_SALIDA',
      1,
      { menorId: 10 },
      'sesion-1',
      'uuid-123'
    );

    expect(accion).toBeDefined();
    expect(accion.tipo).toBe('CONFIRMAR_SALIDA');
    expect(service.totalPendientes()).toBe(1);
    expect(service.hayAccionesPendientes()).toBe(true);

    const enStorage = JSON.parse(localStorage.getItem('tdn_operario_offline_queue_v1') || '[]');
    expect(enStorage.length).toBe(1);
    expect(enStorage[0].id).toBe(accion.id);
  });

  it('should remove action by id and clear queue', () => {
    const a1 = service.encolarAccion('PAUSAR_SESION', 1, {});
    const a2 = service.encolarAccion('CONFIRMAR_SALIDA', 1, {});
    expect(service.totalPendientes()).toBe(2);

    service.removerAccion(a1.id);
    expect(service.totalPendientes()).toBe(1);
    expect(service.accionesPendientes()[0].id).toBe(a2.id);

    service.limpiarCola();
    expect(service.totalPendientes()).toBe(0);
  });

  it('should synchronize pending queue successfully', async () => {
    service.encolarAccion('CONFIRMAR_SALIDA', 1, { ticket: 'T1' });
    service.encolarAccion('PAUSAR_SESION', 1, { ticket: 'T2' });

    const ejecutor = vi.fn().mockImplementation(() => of({ status: 'ok' }));

    const resultado = await new Promise<{ procesadas: number; fallidas: number }>(resolve => {
      service.sincronizarColaPendiente(ejecutor).subscribe(res => resolve(res));
    });

    expect(resultado.procesadas).toBe(2);
    expect(resultado.fallidas).toBe(0);
    expect(service.totalPendientes()).toBe(0);
  });

  it('should handle failures during queue synchronization and keep failed items', async () => {
    service.encolarAccion('CONFIRMAR_SALIDA', 1, { ticket: 'T1' });

    const ejecutor = vi.fn().mockImplementation(() => throwError(() => new Error('Network error')));

    const resultado = await new Promise<{ procesadas: number; fallidas: number }>(resolve => {
      service.sincronizarColaPendiente(ejecutor).subscribe(res => resolve(res));
    });

    expect(resultado.procesadas).toBe(0);
    expect(resultado.fallidas).toBe(1);
    expect(service.totalPendientes()).toBe(1);
    expect(service.accionesPendientes()[0].reintentos).toBe(1);
  });

  it('should evict poison-pill actions on permanent 4xx errors or after MAX_REINTENTOS', async () => {
    service.encolarAccion('CONFIRMAR_SALIDA', 1, { ticket: 'BAD' });

    const ejecutor400 = vi.fn().mockImplementation(() => throwError(() => ({ status: 400 })));

    const res400 = await new Promise<{ procesadas: number; fallidas: number }>(resolve => {
      service.sincronizarColaPendiente(ejecutor400).subscribe(res => resolve(res));
    });

    expect(res400.fallidas).toBe(1);
    expect(service.totalPendientes()).toBe(0);
    expect(service.accionesDescartadas().length).toBe(1);
  });
});
