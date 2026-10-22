import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';
import { ToastNotificationComponent } from '../../shared/components/toast-notification/toast-notification.component';

describe('NotificationService', () => {
  let service: NotificationService;
  let snackBarSpy: { openFromComponent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    snackBarSpy = { openFromComponent: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    });

    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call MatSnackBar.openFromComponent on success with toast-success class and duration 3700', () => {
    service.success('Operación exitosa');
    expect(snackBarSpy.openFromComponent).toHaveBeenCalledWith(
      ToastNotificationComponent,
      expect.objectContaining({
        duration: 3700,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: expect.arrayContaining(['toast-custom-pane', 'toast-success']),
        data: expect.objectContaining({
          message: 'Operación exitosa',
          title: undefined,
          type: 'success',
          duration: 3700
        })
      })
    );
  });

  it('should call MatSnackBar.openFromComponent on error with toast-error class and duration 3700', () => {
    service.error('Error al procesar');
    expect(snackBarSpy.openFromComponent).toHaveBeenCalledWith(
      ToastNotificationComponent,
      expect.objectContaining({
        duration: 3700,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: expect.arrayContaining(['toast-custom-pane', 'toast-error']),
        data: expect.objectContaining({
          message: 'Error al procesar',
          title: undefined,
          type: 'error',
          duration: 3700
        })
      })
    );
  });

  it('should call MatSnackBar.openFromComponent on warn with toast-warn class and duration 3700', () => {
    service.warn('Advertencia importante');
    expect(snackBarSpy.openFromComponent).toHaveBeenCalledWith(
      ToastNotificationComponent,
      expect.objectContaining({
        duration: 3700,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: expect.arrayContaining(['toast-custom-pane', 'toast-warn']),
        data: expect.objectContaining({
          message: 'Advertencia importante',
          title: undefined,
          type: 'warn',
          duration: 3700
        })
      })
    );
  });

  it('should call MatSnackBar.openFromComponent on info with toast-info class and duration 3700', () => {
    service.info('Información general');
    expect(snackBarSpy.openFromComponent).toHaveBeenCalledWith(
      ToastNotificationComponent,
      expect.objectContaining({
        duration: 3700,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: expect.arrayContaining(['toast-custom-pane', 'toast-info']),
        data: expect.objectContaining({
          message: 'Información general',
          title: undefined,
          type: 'info',
          duration: 3700
        })
      })
    );
  });

  it('should support custom title and duration', () => {
    service.success('Venta completada', 'Facturación', 2000);
    expect(snackBarSpy.openFromComponent).toHaveBeenCalledWith(
      ToastNotificationComponent,
      expect.objectContaining({
        duration: 2000,
        data: expect.objectContaining({
          message: 'Venta completada',
          title: 'Facturación',
          type: 'success',
          duration: 2000
        })
      })
    );
  });

  it('should support passing duration as second parameter when title is omitted', () => {
    service.warn('Tiempo agotado', 2500);
    expect(snackBarSpy.openFromComponent).toHaveBeenCalledWith(
      ToastNotificationComponent,
      expect.objectContaining({
        duration: 2500,
        data: expect.objectContaining({
          message: 'Tiempo agotado',
          title: undefined,
          type: 'warn',
          duration: 2500
        })
      })
    );
  });
});
