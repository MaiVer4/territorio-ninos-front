import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  private defaultConfig: MatSnackBarConfig = {
    duration: 4000,
    horizontalPosition: 'right',
    verticalPosition: 'top'
  };

  success(message: string, duration = 4000): void {
    this.snackBar.open(message, 'Cerrar', {
      ...this.defaultConfig,
      duration,
      panelClass: ['toast-success', 'bg-emerald-600', 'text-white']
    });
  }

  error(message: string, duration = 5000): void {
    this.snackBar.open(message, 'Cerrar', {
      ...this.defaultConfig,
      duration,
      panelClass: ['toast-error', 'bg-red-600', 'text-white']
    });
  }

  warn(message: string, duration = 4500): void {
    this.snackBar.open(message, 'Cerrar', {
      ...this.defaultConfig,
      duration,
      panelClass: ['toast-warn', 'bg-amber-500', 'text-white']
    });
  }

  info(message: string, duration = 4000): void {
    this.snackBar.open(message, 'Cerrar', {
      ...this.defaultConfig,
      duration,
      panelClass: ['toast-info', 'bg-blue-600', 'text-white']
    });
  }
}
