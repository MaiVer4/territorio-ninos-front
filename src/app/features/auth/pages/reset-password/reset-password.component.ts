import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { strictPasswordValidator } from '../../../../core/utils/password.validator';

export { strictPasswordValidator };

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="min-h-screen flex justify-center items-center bg-slate-50 p-6 sm:p-8">
  <div class="w-full max-w-md">
    <div class="mb-8 text-center">
      <div class="w-14 h-14 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-4 shadow-sm">
        <span class="material-symbols-outlined text-3xl">lock_reset</span>
      </div>
      <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight">Nueva contraseña</h2>
      <p class="text-slate-500 mt-2 text-sm">Crea una contraseña segura para proteger tu cuenta.</p>
    </div>

    <mat-card class="!shadow-2xl !rounded-3xl !border !border-slate-100 !bg-white overflow-hidden">
      <mat-card-content class="!p-6 sm:!p-8">
        
        @if (isCompleted) {
          <div class="py-6 text-center flex flex-col items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <span class="material-symbols-outlined text-4xl">check_circle</span>
            </div>
            <h3 class="text-xl font-bold text-slate-800">¡Contraseña actualizada!</h3>
            <p class="text-slate-500 text-sm max-w-xs leading-relaxed">
              Tu contraseña se ha restablecido exitosamente. Ya puedes ingresar al sistema con tu nueva clave.
            </p>
            <a mat-flat-button color="primary" routerLink="/login" class="!py-6 !px-8 !text-base !font-bold !rounded-2xl !bg-blue-600 w-full mt-2">
              Iniciar sesión
            </a>
          </div>
        } @else {
          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
            
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-slate-700 ml-1">Nueva Contraseña</label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-icon matPrefix class="text-slate-400 mr-2">lock</mat-icon>
                <input matInput formControlName="nuevaContrasena" [type]="hidePassword ? 'password' : 'text'" placeholder="••••••••" autocomplete="new-password">
                <button type="button" mat-icon-button matSuffix (click)="hidePassword = !hidePassword" aria-label="Ver u ocultar contraseña">
                  <mat-icon class="text-slate-400">{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                @if (resetForm.get('nuevaContrasena')?.hasError('required')) {
                  <mat-error>La contraseña es requerida</mat-error>
                }
              </mat-form-field>

              <!-- Requisitos visuales de contraseña -->
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs flex flex-col gap-1.5 text-slate-600">
                <span class="font-semibold text-slate-700 mb-0.5">La contraseña debe incluir:</span>
                <div class="flex items-center gap-2" [class.text-emerald-600]="hasLength" [class.font-medium]="hasLength">
                  <span class="material-symbols-outlined text-sm">{{ hasLength ? 'check_circle' : 'radio_button_unchecked' }}</span>
                  <span>Mínimo 8 caracteres</span>
                </div>
                <div class="flex items-center gap-2" [class.text-emerald-600]="hasUpper" [class.font-medium]="hasUpper">
                  <span class="material-symbols-outlined text-sm">{{ hasUpper ? 'check_circle' : 'radio_button_unchecked' }}</span>
                  <span>Al menos una letra mayúscula (A-Z)</span>
                </div>
                <div class="flex items-center gap-2" [class.text-emerald-600]="hasLower" [class.font-medium]="hasLower">
                  <span class="material-symbols-outlined text-sm">{{ hasLower ? 'check_circle' : 'radio_button_unchecked' }}</span>
                  <span>Al menos una letra minúscula (a-z)</span>
                </div>
                <div class="flex items-center gap-2" [class.text-emerald-600]="hasNumber" [class.font-medium]="hasNumber">
                  <span class="material-symbols-outlined text-sm">{{ hasNumber ? 'check_circle' : 'radio_button_unchecked' }}</span>
                  <span>Al menos un número (0-9)</span>
                </div>
              </div>
            </div>
            
            <div class="flex flex-col gap-1.5 mt-2">
              <label class="text-sm font-semibold text-slate-700 ml-1">Confirmar Contraseña</label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-icon matPrefix class="text-slate-400 mr-2">verified_user</mat-icon>
                <input matInput formControlName="confirmarContrasena" [type]="hideConfirm ? 'password' : 'text'" placeholder="Repite tu contraseña" autocomplete="new-password">
                <button type="button" mat-icon-button matSuffix (click)="hideConfirm = !hideConfirm" aria-label="Ver u ocultar confirmación">
                  <mat-icon class="text-slate-400">{{hideConfirm ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                @if (resetForm.get('confirmarContrasena')?.hasError('required')) {
                  <mat-error>La confirmación es requerida</mat-error>
                }
                @if (resetForm.hasError('mismatch')) {
                  <mat-error>Las contraseñas no coinciden</mat-error>
                }
              </mat-form-field>
            </div>

            <button mat-flat-button color="primary" type="submit" [disabled]="resetForm.invalid || isLoading || !token" 
                    class="!py-6 !text-base !font-extrabold !rounded-2xl !bg-blue-600 w-full mt-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60">
              @if (!isLoading) {
                <span>Restablecer Contraseña</span>
              } @else {
                <mat-spinner diameter="24" color="accent" class="mx-auto"></mat-spinner>
              }
            </button>
          </form>
          
          <div class="mt-6 text-center">
            <a routerLink="/login" class="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1">
              <span class="material-symbols-outlined text-base">arrow_back</span> Cancelar y volver
            </a>
          </div>
        }
      </mat-card-content>
    </mat-card>
  </div>
</div>
  `
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  resetForm: FormGroup = this.fb.group({
    nuevaContrasena: ['', [Validators.required, strictPasswordValidator]],
    confirmarContrasena: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  token: string = '';
  hidePassword = true;
  hideConfirm = true;
  isLoading = false;
  isCompleted = false;

  get hasLength(): boolean {
    const val = this.resetForm.get('nuevaContrasena')?.value || '';
    return val.length >= 8;
  }

  get hasUpper(): boolean {
    const val = this.resetForm.get('nuevaContrasena')?.value || '';
    return /[A-Z]/.test(val);
  }

  get hasLower(): boolean {
    const val = this.resetForm.get('nuevaContrasena')?.value || '';
    return /[a-z]/.test(val);
  }

  get hasNumber(): boolean {
    const val = this.resetForm.get('nuevaContrasena')?.value || '';
    return /\d/.test(val);
  }

  passwordMatchValidator(g: AbstractControl): ValidationErrors | null {
    const password = g.get('nuevaContrasena')?.value;
    const confirm = g.get('confirmarContrasena')?.value;
    return password && confirm && password !== confirm ? { mismatch: true } : null;
  }

  constructor() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.notificationService.error('El enlace de recuperación es inválido o no incluye el token requerido.');
        this.cdr.markForCheck();
      }
    });
  }

  onSubmit(): void {
    if (!this.token) {
      this.notificationService.error('No se encontró el token de seguridad. Vuelve a solicitar un enlace.');
      return;
    }

    if (this.resetForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.cdr.markForCheck();
      
      this.authService.resetPassword(this.token, this.resetForm.value.nuevaContrasena)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.isLoading = false;
            this.isCompleted = true;
            this.notificationService.success(res.mensaje || '¡Contraseña restablecida correctamente!');
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.isLoading = false;
            const msg = err.status === 401 
              ? 'El enlace de recuperación ha expirado o ya fue utilizado.' 
              : (err.error?.mensaje || 'Ocurrió un error al restablecer tu contraseña. Inténtalo nuevamente.');
            this.notificationService.error(msg);
            this.cdr.markForCheck();
          }
        });
    }
  }
}
