import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
<div class="min-h-screen flex justify-center items-center bg-slate-50 p-8">
  <div class="w-full max-w-md">
    <div class="mb-10 text-center">
      <h2 class="text-3xl font-bold text-slate-800">Nueva contraseña</h2>
      <p class="text-slate-500 mt-2">Ingresa tu nueva contraseña para acceder a Territorio de Niños.</p>
    </div>

    <mat-card class="!shadow-xl !rounded-2xl !bg-white">
      <mat-card-content class="!p-8">
        
        <div *ngIf="successMessage" class="mb-6 p-4 bg-green-50 text-green-700 rounded-lg text-sm flex flex-col items-center gap-2 border border-green-200">
          <span class="material-symbols-outlined text-4xl mb-2">check_circle</span>
          <span class="text-center">{{ successMessage }}</span>
          <button mat-flat-button color="primary" routerLink="/login" class="mt-4 !rounded-xl !bg-blue-600">
            Ir a Iniciar Sesión
          </button>
        </div>
        
        <div *ngIf="errorMessage" class="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-200">
          <span class="material-symbols-outlined">error</span>
          {{ errorMessage }}
        </div>

        <form *ngIf="!successMessage" [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
          
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold text-slate-700">Nueva Contraseña</label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-icon matPrefix class="text-slate-400">lock</mat-icon>
              <input matInput formControlName="nuevaContrasena" [type]="hidePassword ? 'password' : 'text'" placeholder="Mínimo 8 caracteres">
              <button type="button" mat-icon-button matSuffix (click)="hidePassword = !hidePassword">
                <mat-icon class="text-slate-400">{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
              </button>
              <mat-error *ngIf="resetForm.get('nuevaContrasena')?.hasError('required')">Requerido</mat-error>
              <mat-error *ngIf="resetForm.get('nuevaContrasena')?.hasError('minlength')">Mínimo 8 caracteres</mat-error>
            </mat-form-field>
          </div>
          
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold text-slate-700">Confirmar Contraseña</label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-icon matPrefix class="text-slate-400">lock_check</mat-icon>
              <input matInput formControlName="confirmarContrasena" [type]="hideConfirm ? 'password' : 'text'" placeholder="Repita la contraseña">
              <button type="button" mat-icon-button matSuffix (click)="hideConfirm = !hideConfirm">
                <mat-icon class="text-slate-400">{{hideConfirm ? 'visibility_off' : 'visibility'}}</mat-icon>
              </button>
              <mat-error *ngIf="resetForm.hasError('mismatch')">Las contraseñas no coinciden</mat-error>
            </mat-form-field>
          </div>

          <button mat-flat-button color="primary" type="submit" [disabled]="resetForm.invalid || isLoading" class="!py-6 !text-lg !rounded-xl !bg-blue-600 w-full mt-2 transition-transform hover:scale-[1.02] active:scale-95">
            <span *ngIf="!isLoading">Restablecer Contraseña</span>
            <mat-spinner *ngIf="isLoading" diameter="24" color="accent"></mat-spinner>
          </button>
        </form>
        
        <div class="mt-6 text-center" *ngIf="!successMessage">
          <a routerLink="/login" class="text-sm text-blue-600 hover:underline flex items-center justify-center gap-1">
            Cancelar
          </a>
        </div>
      </mat-card-content>
    </mat-card>
  </div>
</div>
  `
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  resetForm: FormGroup = this.fb.group({
    nuevaContrasena: ['', [Validators.required, Validators.minLength(8)]],
    confirmarContrasena: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  token: string = '';
  hidePassword = true;
  hideConfirm = true;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  passwordMatchValidator(g: FormGroup) {
    return g.get('nuevaContrasena')?.value === g.get('confirmarContrasena')?.value
      ? null : { mismatch: true };
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (!this.token) {
        this.errorMessage = 'Enlace de recuperación inválido o incompleto.';
      }
    });
  }

  onSubmit(): void {
    if (this.resetForm.valid && this.token) {
      this.isLoading = true;
      this.errorMessage = '';
      
      this.authService.resetPassword(this.token, this.resetForm.value.nuevaContrasena).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.successMessage = res.mensaje || 'Contraseña actualizada correctamente.';
          this.resetForm.reset();
        },
        error: (err) => {
          this.isLoading = false;
          if (err.status === 401) {
            this.errorMessage = 'El enlace ha expirado o no es válido.';
          } else {
            this.errorMessage = 'Ocurrió un error al restablecer tu contraseña.';
          }
        }
      });
    } else if (!this.token) {
      this.errorMessage = 'Falta el token de seguridad. Vuelve a solicitar un enlace.';
    }
  }
}
