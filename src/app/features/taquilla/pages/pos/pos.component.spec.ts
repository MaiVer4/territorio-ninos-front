import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaquillaPosComponent } from './pos.component';
import { AuthService } from '../../../../core/services/auth.service';
import { signal } from '@angular/core';

describe('TaquillaPosComponent', () => {
  let component: TaquillaPosComponent;
  let fixture: ComponentFixture<TaquillaPosComponent>;
  let authServiceSpy: { currentUser: any; logout: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authServiceSpy = {
      currentUser: signal({ correo: 'taquillero@tdn.com.co', rol: 'TAQUILLERO' }),
      logout: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [TaquillaPosComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaquillaPosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and render user email', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('taquillero@tdn.com.co');
  });

  it('should call logout on button click', () => {
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });
});
