import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UnauthorizedComponent } from './unauthorized.component';
import { AuthService } from '../../../../core/services/auth.service';

describe('UnauthorizedComponent', () => {
  let component: UnauthorizedComponent;
  let fixture: ComponentFixture<UnauthorizedComponent>;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };
  let authServiceSpy: { getRole: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    routerSpy = { navigate: vi.fn() };
    authServiceSpy = {
      getRole: vi.fn(),
      logout: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [UnauthorizedComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UnauthorizedComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to admin dashboard if role is ADMINISTRADOR', () => {
    authServiceSpy.getRole.mockReturnValue('ADMINISTRADOR');
    component.goToAssignedPanel();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('should navigate to taquilla pos if role is TAQUILLERO', () => {
    authServiceSpy.getRole.mockReturnValue('TAQUILLERO');
    component.goToAssignedPanel();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/taquilla/pos']);
  });

  it('should navigate to operario seleccion if role is OPERARIO', () => {
    authServiceSpy.getRole.mockReturnValue('OPERARIO');
    component.goToAssignedPanel();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/operario/seleccion']);
  });

  it('should call authService.logout when clicking logout', () => {
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });
});
