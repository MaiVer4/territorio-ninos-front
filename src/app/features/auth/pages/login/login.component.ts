import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
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
  template: `
<div class="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 relative overflow-hidden font-sans">
  
  <!-- Elementos decorativos de fondo (Blobs con Tailwind) -->
  <div class="absolute -top-[10%] -left-[10%] w-[25rem] h-[25rem] md:w-[40rem] md:h-[40rem] bg-blue-300 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[128px] opacity-40 animate-pulse"></div>
  <div class="absolute -bottom-[10%] -right-[10%] w-[25rem] h-[25rem] md:w-[40rem] md:h-[40rem] bg-indigo-300 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[128px] opacity-40 animate-pulse" style="animation-delay: 2s;"></div>

  <!-- Lado Izquierdo: Branding (Cabecera en móvil, Panel izquierdo en PC) -->
  <div class="w-full lg:w-5/12 xl:w-1/2 flex flex-col justify-center items-center p-6 sm:p-8 lg:p-16 relative z-10 text-center lg:text-left mt-8 lg:mt-0">
    <div class="max-w-md w-full">
      
      <!-- Logo o Icono -->
      <div class="w-16 h-16 sm:w-20 sm:h-20 mx-auto lg:mx-0 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6 sm:mb-8 transform transition hover:scale-105 duration-300">
        <span class="material-symbols-outlined text-white text-4xl sm:text-5xl">castle</span>
      </div>
      
      <h1 class="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
        Territorio de <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Niños</span>
      </h1>
      <p class="text-base sm:text-lg lg:text-xl text-slate-600 mb-8 leading-relaxed">
        El sistema integral para la gestión inteligente, segura y divertida de tu parque de diversiones.
      </p>

      <!-- Highlights (ocultos en móvil muy pequeño, visibles en tablet/PC) -->
      <div class="hidden sm:grid grid-cols-2 gap-4 mt-8 lg:mt-12">
        <div class="flex items-center gap-3 p-4 bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm transition-transform hover:-translate-y-1">
          <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <span class="material-symbols-outlined text-xl">speed</span>
          </div>
          <div class="text-left">
            <h4 class="font-semibold text-slate-800 text-sm">Rápido</h4>
            <p class="text-xs text-slate-500">Gestión en tiempo real</p>
          </div>
        </div>
        <div class="flex items-center gap-3 p-4 bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm transition-transform hover:-translate-y-1">
          <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <span class="material-symbols-outlined text-xl">security</span>
          </div>
          <div class="text-left">
            <h4 class="font-semibold text-slate-800 text-sm">Seguro</h4>
            <p class="text-xs text-slate-500">Accesos controlados</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Lado Derecho: Formulario de Login -->
  <div class="w-full lg:w-7/12 xl:w-1/2 flex justify-center items-center p-4 sm:p-8 lg:p-16 relative z-10 mb-8 lg:mb-0">
    <div class="w-full max-w-[440px]">
      
      <mat-card class="!rounded-[2rem] !shadow-2xl !shadow-slate-300/60 !border !border-white/60 backdrop-blur-xl bg-white/90 overflow-hidden">
        <mat-card-content class="!p-6 sm:!p-10">
          
          <div class="mb-8 text-center">
            <h2 class="text-2xl font-bold text-slate-800">¡Hola de nuevo! 👋</h2>
            <p class="text-slate-500 mt-2 text-sm">Ingresa tus credenciales para acceder</p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-5">
            
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-slate-700 ml-1" for="correo">Correo electrónico</label>
              <mat-form-field appearance="outline" class="w-full !text-base">
                <mat-icon matPrefix class="text-slate-400 mr-2">mail</mat-icon>
                <input matInput id="correo" formControlName="correo" placeholder="ejemplo@tdn.com.co" type="email" autocomplete="email">
                @if (loginForm.get('correo')?.hasError('required')) {
                  <mat-error>El correo es requerido</mat-error>
                }
                @if (loginForm.get('correo')?.hasError('email')) {
                  <mat-error>Formato inválido</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-slate-700 ml-1" for="contrasena">Contraseña</label>
              <mat-form-field appearance="outline" class="w-full !text-base">
                <mat-icon matPrefix class="text-slate-400 mr-2">lock</mat-icon>
                <input matInput id="contrasena" formControlName="contrasena" [type]="hidePassword ? 'password' : 'text'" placeholder="••••••••" autocomplete="current-password">
                <button type="button" mat-icon-button matSuffix (click)="hidePassword = !hidePassword" aria-label="Ocultar o mostrar contraseña">
                  <mat-icon class="text-slate-400">{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                @if (loginForm.get('contrasena')?.hasError('required')) {
                  <mat-error>La contraseña es requerida</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="flex justify-end -mt-3 mb-2">
              <a routerLink="/forgot-password" class="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors focus:outline-none focus:underline rounded-md px-1 py-0.5">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button mat-flat-button color="primary" type="submit" [disabled]="loginForm.invalid || isLoading" 
                    class="!py-6 !text-lg !font-extrabold !text-white !rounded-2xl !bg-gradient-to-r !from-blue-600 !to-indigo-600 !shadow-lg !shadow-blue-500/30 w-full transition-all hover:scale-[1.02] hover:shadow-blue-500/40 active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed">
              @if (!isLoading) {
                <span class="flex items-center justify-center gap-2 tracking-wide">
                  Iniciar sesión <span class="material-symbols-outlined text-base">arrow_forward</span>
                </span>
              } @else {
                <mat-spinner diameter="24" color="accent" class="mx-auto"></mat-spinner>
              }
            </button>
          </form>
          
        </mat-card-content>
      </mat-card>

      <p class="text-center text-slate-400 text-xs mt-8 font-medium">
        &copy; 2026 Territorio de Niños • Sistema Interno
      </p>
    </div>
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
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
            this.notificationService.success(`¡Bienvenido al sistema! (${this.authService.currentUserName()})`);
            
            // Si el usuario intentaba acceder a una ruta específica previa (deep linking) con validación anti Open Redirect
            const returnUrl = this.route.snapshot.queryParams['returnUrl'];
            if (this.isSafeReturnUrl(returnUrl)) {
              this.router.navigateByUrl(returnUrl);
              return;
            }

            // Redirección por roles predeterminados
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

  /**
   * Valida que returnUrl sea una ruta relativa local interna segura,
   * descartando URLs absolutas, de protocolo relativo (//) o bucles hacia /login.
   */
  isSafeReturnUrl(url: unknown): url is string {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    return trimmed.startsWith('/') &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('/\\') &&
      !trimmed.startsWith('/login');
  }
}
