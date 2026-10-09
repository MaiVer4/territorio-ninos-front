#!/bin/bash
set -e

# Generate Login component
npx ng generate component features/auth/pages/login --standalone --inline-style

# Create the Login UI
cat << 'HTML' > src/app/features/auth/pages/login/login.component.html
<div class="min-h-screen flex w-full">
  <!-- Left Side: Banner / Branding -->
  <div class="hidden lg:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-blue-700 to-blue-500 text-white p-12">
    <div class="text-center">
      <h1 class="text-5xl font-bold mb-4">Territorio de Niños</h1>
      <p class="text-xl mb-12 text-blue-100">Diversión segura, gestión inteligente</p>
      
      <div class="grid grid-cols-3 gap-6 opacity-90">
        <!-- Mock Icons using Material Icons -->
        <div class="flex flex-col items-center bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
          <span class="material-symbols-outlined text-4xl mb-2">water</span>
          <span class="text-sm">Piscina</span>
        </div>
        <div class="flex flex-col items-center bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
          <span class="material-symbols-outlined text-4xl mb-2">attractions</span>
          <span class="text-sm">Carrusel</span>
        </div>
        <div class="flex flex-col items-center bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
          <span class="material-symbols-outlined text-4xl mb-2">toys</span>
          <span class="text-sm">Inflables</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Right Side: Login Form -->
  <div class="flex-1 flex justify-center items-center bg-slate-50 p-8">
    <div class="w-full max-w-md">
      <div class="mb-10 text-center lg:text-left">
        <h2 class="text-3xl font-bold text-slate-800">Iniciar sesión</h2>
        <p class="text-slate-500 mt-2">Ingresa tus credenciales para acceder al sistema.</p>
      </div>

      <mat-card class="!shadow-xl !rounded-2xl !bg-white">
        <mat-card-content class="!p-8">
          
          <div *ngIf="errorMessage" class="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-200">
            <span class="material-symbols-outlined">error</span>
            {{ errorMessage }}
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
            
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-slate-700">Correo electrónico</label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-icon matPrefix class="text-slate-400">mail</mat-icon>
                <input matInput formControlName="correo" placeholder="ejemplo@tdn.com.co" type="email">
                <mat-error *ngIf="loginForm.get('correo')?.hasError('required')">El correo es requerido</mat-error>
                <mat-error *ngIf="loginForm.get('correo')?.hasError('email')">Formato inválido</mat-error>
              </mat-form-field>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-slate-700">Contraseña</label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-icon matPrefix class="text-slate-400">lock</mat-icon>
                <input matInput formControlName="contrasena" [type]="hidePassword ? 'password' : 'text'" placeholder="••••••••">
                <button type="button" mat-icon-button matSuffix (click)="hidePassword = !hidePassword" [attr.aria-label]="'Hide password'">
                  <mat-icon class="text-slate-400">{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-error *ngIf="loginForm.get('contrasena')?.hasError('required')">La contraseña es requerida</mat-error>
              </mat-form-field>
            </div>

            <div class="flex justify-end -mt-2 mb-4">
              <a routerLink="/forgot-password" class="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button mat-flat-button color="primary" type="submit" [disabled]="loginForm.invalid || isLoading" class="!py-6 !text-lg !rounded-xl !bg-blue-600 w-full transition-transform hover:scale-[1.02] active:scale-95">
              <span *ngIf="!isLoading" class="flex items-center gap-2">
                Ingresar <span class="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
              <mat-spinner *ngIf="isLoading" diameter="24" color="accent"></mat-spinner>
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <p class="text-center text-slate-400 text-sm mt-8">
        Territorio de Niños • Sistema Interno • 2026
      </p>
    </div>
  </div>
</div>
HTML

# Login TS
cat << 'TS' > src/app/features/auth/pages/login/login.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../../core/services/auth.service';

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
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  errorMessage = '';

  constructor() {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      
      this.authService.login(this.loginForm.value).subscribe({
        next: (res) => {
          this.isLoading = false;
          // Redirección por roles
          const rol = res.rol;
          if (rol === 'ROLE_ADMIN') this.router.navigate(['/admin/dashboard']);
          else if (rol === 'ROLE_TAQUILLERO') this.router.navigate(['/taquilla/pos']);
          else if (rol === 'ROLE_OPERARIO') this.router.navigate(['/operario/monitor']);
          else this.router.navigate(['/']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.';
        }
      });
    }
  }
}
TS

# Add Material Symbols font to index.html for icons
sed -i 's|</head>|  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />\n</head>|g' src/index.html

# Update Routes
cat << 'ROUTES' > src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
ROUTES

git add .
git commit -m "feat(auth): implement login ui matching figma prototypes"

echo "Login implementado exitosamente."
