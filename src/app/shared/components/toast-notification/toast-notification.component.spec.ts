import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { ToastNotificationComponent } from './toast-notification.component';
import { ToastData } from '../../../core/models/toast.model';

describe('ToastNotificationComponent', () => {
  let component: ToastNotificationComponent;
  let fixture: ComponentFixture<ToastNotificationComponent>;
  let mockSnackBarRef: { dismiss: ReturnType<typeof vi.fn> };

  const defaultMockData: ToastData = {
    message: 'Operación realizada con éxito',
    title: 'Confirmado',
    type: 'success',
    duration: 3700
  };

  const createComponent = async (data?: ToastData, provideRef = true) => {
    mockSnackBarRef = { dismiss: vi.fn() };

    const providers: any[] = [];
    if (data !== undefined) {
      providers.push({ provide: MAT_SNACK_BAR_DATA, useValue: data });
    }
    if (provideRef) {
      providers.push({ provide: MatSnackBarRef, useValue: mockSnackBarRef });
    }

    await TestBed.configureTestingModule({
      imports: [ToastNotificationComponent],
      providers
    }).compileComponents();

    fixture = TestBed.createComponent(ToastNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('should create with provided data', async () => {
    await createComponent(defaultMockData);
    expect(component).toBeTruthy();
    expect(component.type).toBe('success');
    expect(component.duration).toBe(3700);
  });

  it('should create with fallback defaults when no injection provided', async () => {
    await createComponent(undefined, false);
    expect(component).toBeTruthy();
    expect(component.type).toBe('info');
    expect(component.duration).toBe(3700);
    expect(component.data.message).toBe('');
  });

  it('should display title and message when title is provided', async () => {
    await createComponent({
      message: 'Se guardaron los cambios.',
      title: '¡Operación Exitosa!',
      type: 'success',
      duration: 3700
    });

    const el: HTMLElement = fixture.nativeElement;
    const titleEl = el.querySelector('h4');
    expect(titleEl).toBeTruthy();
    expect(titleEl?.textContent?.trim()).toBe('¡Operación Exitosa!');
    expect(el.textContent).toContain('Se guardaron los cambios.');
  });

  it('should display only message when title is not provided', async () => {
    await createComponent({
      message: 'Notificación simple sin encabezado',
      type: 'info',
      duration: 3700
    });

    const el: HTMLElement = fixture.nativeElement;
    const titleEl = el.querySelector('h4');
    expect(titleEl).toBeNull();
    expect(el.textContent).toContain('Notificación simple sin encabezado');
  });

  it('should render emerald capsule and progress bar for success type', async () => {
    await createComponent({
      message: 'Éxito',
      type: 'success',
      duration: 3700
    });

    expect(component.capsuleClasses).toContain('bg-emerald-50');
    expect(component.capsuleClasses).toContain('text-emerald-600');
    expect(component.capsuleClasses).toContain('border-emerald-100');
    expect(component.progressBarClass).toBe('bg-emerald-500');

    const progressBar = fixture.nativeElement.querySelector('.toast-progress-bar');
    expect(progressBar.classList.contains('bg-emerald-500')).toBe(true);
  });

  it('should render rose capsule, progress bar, and role=alert for error type', async () => {
    await createComponent({
      message: 'Ha ocurrido un problema',
      type: 'error',
      duration: 3700
    });

    expect(component.capsuleClasses).toContain('bg-rose-50');
    expect(component.capsuleClasses).toContain('text-rose-600');
    expect(component.capsuleClasses).toContain('border-rose-100');
    expect(component.progressBarClass).toBe('bg-rose-500');

    const container = fixture.nativeElement.querySelector('[role="alert"]');
    expect(container).toBeTruthy();
    expect(container.getAttribute('aria-live')).toBe('assertive');
  });

  it('should render amber capsule and progress bar for warn type', async () => {
    await createComponent({
      message: 'Atención con la acción',
      type: 'warn',
      duration: 3700
    });

    expect(component.capsuleClasses).toContain('bg-amber-50');
    expect(component.capsuleClasses).toContain('text-amber-600');
    expect(component.capsuleClasses).toContain('border-amber-100');
    expect(component.progressBarClass).toBe('bg-amber-500');
  });

  it('should render blue capsule and progress bar for info type', async () => {
    await createComponent({
      message: 'Información general',
      type: 'info',
      duration: 3700
    });

    expect(component.capsuleClasses).toContain('bg-blue-50');
    expect(component.capsuleClasses).toContain('text-blue-600');
    expect(component.capsuleClasses).toContain('border-blue-100');
    expect(component.progressBarClass).toBe('bg-blue-500');
  });

  it('should set animation duration on progress bar matching configured duration', async () => {
    await createComponent({
      message: 'Tiempo personalizado',
      type: 'info',
      duration: 2500
    });

    const progressBar = fixture.nativeElement.querySelector('.toast-progress-bar');
    expect(progressBar).toBeTruthy();
    expect(progressBar.style.animationDuration).toBe('2500ms');
  });

  it('should dismiss notification when close button is clicked', async () => {
    await createComponent(defaultMockData);

    const closeBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('button[aria-label="Cerrar notificación"]');
    expect(closeBtn).toBeTruthy();

    closeBtn?.click();
    expect(mockSnackBarRef.dismiss).toHaveBeenCalledTimes(1);
  });

  it('should not throw error when dismiss is called and snackBarRef is undefined', async () => {
    await createComponent(defaultMockData, false);
    expect(() => component.dismiss()).not.toThrow();
  });
});
