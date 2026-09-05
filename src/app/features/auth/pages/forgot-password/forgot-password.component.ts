import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="min-h-screen flex justify-center items-center bg-slate-50 p-8">
  <div class="w-full max-w-md">
    <div class="mb-10 text-center">
      <h2 class="text-3xl font-bold text-slate-800">Recuperar contraseña</h2>
      <p class="text-slate-500 mt-2">Ingresa tu correo para recibir un enlace de recuperación.</p>
    </div>

    <mat-card class="!shadow-xl !rounded-2xl !bg-white">
      <mat-card-content class="!p-8">
        <div *ngIf="successMessage" class="mb-6 p-4 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2 border border-green-200">
          <span class="material-symbols-outlined">check_circle</span>
          {{ successMessage }}
        </div>
        <div *ngIf="errorMessage" class="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-200">
          <span class="material-symbols-outlined">error</span>
          {{ errorMessage }}
        </div>

        <form *ngIf="!successMessage" [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold text-slate-700">Correo electrónico</label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-icon matPrefix class="text-slate-400">mail</mat-icon>
              <input matInput formControlName="email" placeholder="ejemplo@tdn.com.co" type="email">
              <mat-error *ngIf="forgotForm.get('email')?.hasError('required')">El correo es requerido</mat-error>
              <mat-error *ngIf="forgotForm.get('email')?.hasError('email')">Formato inválido</mat-error>
            </mat-form-field>
          </div>

          <button mat-flat-button color="primary" type="submit" [disabled]="forgotForm.invalid || isLoading" class="!py-6 !text-lg !rounded-xl !bg-blue-600 w-full mt-2 transition-transform hover:scale-[1.02] active:scale-95">
            <span *ngIf="!isLoading">Enviar enlace</span>
            <mat-spinner *ngIf="isLoading" diameter="24" color="accent"></mat-spinner>
          </button>
        </form>
        
        <div class="mt-6 text-center">
          <a routerLink="/login" class="text-sm text-blue-600 hover:underline flex items-center justify-center gap-1">
            <span class="material-symbols-outlined text-sm">arrow_back</span> Volver a inicio de sesión
          </a>
        </div>
      </mat-card-content>
    </mat-card>
  </div>
</div>
  `
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  forgotForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  onSubmit(): void {
    if (this.forgotForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      this.cdr.markForCheck();
      
      this.authService.forgotPassword(this.forgotForm.value.email)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.isLoading = false;
            this.successMessage = res.mensaje || 'Se ha enviado un enlace de recuperación a tu correo.';
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = 'Ocurrió un error al procesar la solicitud. Verifica tu conexión.';
            this.cdr.markForCheck();
          }
        });
    }
  }
}
