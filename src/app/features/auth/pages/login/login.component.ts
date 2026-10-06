import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;

  constructor() {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.cdr.markForCheck();
      
      this.authService.login({ correo: this.loginForm.value.correo, password: this.loginForm.value.contrasena })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.isLoading = false;
            this.notificationService.success(`¡Bienvenido al sistema! (${res.correo})`);
            // Redirección por roles
            const rol = res.rol;
            if (rol === 'ADMINISTRADOR') this.router.navigate(['/admin/dashboard']);
            else if (rol === 'TAQUILLERO') this.router.navigate(['/taquilla/pos']);
            else if (rol === 'OPERARIO') this.router.navigate(['/operario/seleccion']);
            else this.router.navigate(['/unauthorized']);
          },
          error: (err) => {
            this.isLoading = false;
            let msg = 'Ha ocurrido un error inesperado. Inténtalo más tarde.';
            if (err.status === 401) {
              msg = 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.';
            } else if (err.status === 403 || err.status === 423) {
              msg = err.error?.mensaje || err.error?.detalles || 'Acceso restringido o cuenta bloqueada temporalmente.';
            } else if (err.status === 0) {
              msg = 'Error de conexión. El servidor no responde.';
            } else if (err.error?.mensaje) {
              msg = err.error.mensaje;
            }
            this.notificationService.error(msg);
            this.cdr.markForCheck();
          }
        });
    }
  }
}
