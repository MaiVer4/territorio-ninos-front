import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CronometroComponent } from './cronometro.component';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('CronometroComponent (HU-27.08, HU-27.09, HU-30.04, HU-31.05)', () => {
  let component: CronometroComponent;
  let fixture: ComponentFixture<CronometroComponent>;

  let wsServiceSpy: {
    obtenerTiempoServidorActual: ReturnType<typeof vi.fn>;
    serverTimeOffsetMs: ReturnType<typeof signal<number>>;
  };

  const fixedServerTime = 1700000000000;

  beforeEach(async () => {
    wsServiceSpy = {
      obtenerTiempoServidorActual: vi.fn().mockReturnValue(fixedServerTime),
      serverTimeOffsetMs: signal(0)
    };

    await TestBed.configureTestingModule({
      imports: [CronometroComponent],
      providers: [
        { provide: WebSocketService, useValue: wsServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CronometroComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should format normal countdown in MM:SS (HU-27.08)', () => {
    // 5 minutes ahead (300 seconds)
    component.horaFin = new Date(fixedServerTime + 300 * 1000).toISOString();
    fixture.detectChanges();

    const display = fixture.debugElement.query(By.css('[data-testid="cronometro-display"]'));
    expect(display).toBeTruthy();
    expect(display.nativeElement.textContent.trim()).toBe('05:00');
    expect(component.estaAgotado()).toBe(false);
    expect(component.estaPreExpiracion()).toBe(false);
  });

  it('should activate pre-expiracion style when remaining time <= 120s (HU-30.04)', () => {
    // 1 minute and 45 seconds ahead (105 seconds)
    component.horaFin = new Date(fixedServerTime + 105 * 1000).toISOString();
    fixture.detectChanges();

    const display = fixture.debugElement.query(By.css('[data-testid="cronometro-display"]'));
    expect(display.nativeElement.textContent.trim()).toBe('01:45');
    expect(component.estaPreExpiracion()).toBe(true);
    expect(component.estaAgotado()).toBe(false);
  });

  it('should activate tiempo agotado with progressive exceeded time when expired (HU-31.05)', () => {
    // 15 seconds in the past
    component.horaFin = new Date(fixedServerTime - 15 * 1000).toISOString();
    fixture.detectChanges();

    const display = fixture.debugElement.query(By.css('[data-testid="cronometro-display"]'));
    expect(display.nativeElement.textContent.trim()).toBe('+00:15');
    expect(component.estaAgotado()).toBe(true);
  });

  it('should freeze time when in pause (HU-29.09)', () => {
    component.horaFin = new Date(fixedServerTime + 300 * 1000).toISOString();
    component.enPausa = true;
    component.segundosCongelados = 180;
    fixture.detectChanges();

    const display = fixture.debugElement.query(By.css('[data-testid="cronometro-display"]'));
    expect(display.nativeElement.textContent.trim()).toBe('03:00');
  });
});
