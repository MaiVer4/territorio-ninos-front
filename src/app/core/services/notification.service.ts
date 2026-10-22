import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig, MatSnackBarRef } from '@angular/material/snack-bar';
import { ToastNotificationComponent } from '../../shared/components/toast-notification/toast-notification.component';
import { ToastData, ToastType } from '../models/toast.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  private readonly defaultDuration = 3700;

  private readonly defaultConfig: MatSnackBarConfig = {
    duration: this.defaultDuration,
    horizontalPosition: 'right',
    verticalPosition: 'top'
  };

  success(message: string, title?: string, duration?: number): MatSnackBarRef<ToastNotificationComponent>;
  success(message: string, duration?: number): MatSnackBarRef<ToastNotificationComponent>;
  success(message: string, titleOrDuration?: string | number, duration = this.defaultDuration): MatSnackBarRef<ToastNotificationComponent> {
    return this.show('success', message, titleOrDuration, duration);
  }

  error(message: string, title?: string, duration?: number): MatSnackBarRef<ToastNotificationComponent>;
  error(message: string, duration?: number): MatSnackBarRef<ToastNotificationComponent>;
  error(message: string, titleOrDuration?: string | number, duration = this.defaultDuration): MatSnackBarRef<ToastNotificationComponent> {
    return this.show('error', message, titleOrDuration, duration);
  }

  warn(message: string, title?: string, duration?: number): MatSnackBarRef<ToastNotificationComponent>;
  warn(message: string, duration?: number): MatSnackBarRef<ToastNotificationComponent>;
  warn(message: string, titleOrDuration?: string | number, duration = this.defaultDuration): MatSnackBarRef<ToastNotificationComponent> {
    return this.show('warn', message, titleOrDuration, duration);
  }

  info(message: string, title?: string, duration?: number): MatSnackBarRef<ToastNotificationComponent>;
  info(message: string, duration?: number): MatSnackBarRef<ToastNotificationComponent>;
  info(message: string, titleOrDuration?: string | number, duration = this.defaultDuration): MatSnackBarRef<ToastNotificationComponent> {
    return this.show('info', message, titleOrDuration, duration);
  }

  private show(
    type: ToastType,
    message: string,
    titleOrDuration?: string | number,
    duration = this.defaultDuration
  ): MatSnackBarRef<ToastNotificationComponent> {
    let title: string | undefined;
    let actualDuration = duration;

    if (typeof titleOrDuration === 'number') {
      actualDuration = titleOrDuration;
      title = undefined;
    } else {
      title = titleOrDuration;
    }

    const data: ToastData = {
      message,
      title,
      type,
      duration: actualDuration
    };

    return this.snackBar.openFromComponent(ToastNotificationComponent, {
      ...this.defaultConfig,
      duration: actualDuration,
      data,
      panelClass: ['toast-custom-pane', `toast-${type}`]
    });
  }
}
