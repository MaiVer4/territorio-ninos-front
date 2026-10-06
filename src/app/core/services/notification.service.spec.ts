import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let snackBarSpy: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    snackBarSpy = { open: vi.fn() };

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

  it('should call MatSnackBar.open on success with toast-success class', () => {
    service.success('Operación exitosa');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Operación exitosa',
      'Cerrar',
      expect.objectContaining({
        duration: 4000,
        panelClass: expect.arrayContaining(['toast-success'])
      })
    );
  });

  it('should call MatSnackBar.open on error with toast-error class', () => {
    service.error('Error al procesar');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Error al procesar',
      'Cerrar',
      expect.objectContaining({
        duration: 5000,
        panelClass: expect.arrayContaining(['toast-error'])
      })
    );
  });

  it('should call MatSnackBar.open on warn with toast-warn class', () => {
    service.warn('Advertencia importante');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Advertencia importante',
      'Cerrar',
      expect.objectContaining({
        duration: 4500,
        panelClass: expect.arrayContaining(['toast-warn'])
      })
    );
  });

  it('should call MatSnackBar.open on info with toast-info class', () => {
    service.info('Información general');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Información general',
      'Cerrar',
      expect.objectContaining({
        duration: 4000,
        panelClass: expect.arrayContaining(['toast-info'])
      })
    );
  });
});
