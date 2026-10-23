import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OperarioSeleccionComponent } from './seleccion.component';
import { AuthService } from '../../../../core/services/auth.service';
import { signal } from '@angular/core';

describe('OperarioSeleccionComponent', () => {
  let component: OperarioSeleccionComponent;
  let fixture: ComponentFixture<OperarioSeleccionComponent>;
  let authServiceSpy: {
    currentUser: any;
    currentUserName: any;
    currentUserInitials: any;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authServiceSpy = {
      currentUser: signal({ correo: 'operario@tdn.com.co', rol: 'OPERARIO' }),
      currentUserName: signal('Operario Principal'),
      currentUserInitials: signal('OP'),
      logout: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [OperarioSeleccionComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OperarioSeleccionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and render operator name and initials', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Operario Principal');
    expect(compiled.textContent).toContain('OP');
    expect(compiled.textContent).toContain('Operario');
  });

  it('should call logout on button click', () => {
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });
});
