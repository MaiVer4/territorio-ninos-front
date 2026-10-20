import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden font-sans">
  <!-- Fondo decorativo suave -->
  <div class="absolute -top-24 -left-24 w-96 h-96 bg-red-100 rounded-full blur-3xl opacity-60"></div>
  <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-100 rounded-full blur-3xl opacity-60"></div>

  <div class="w-full max-w-lg relative z-10 text-center">
    <mat-card class="!rounded-3xl !shadow-2xl !border !border-slate-100 !bg-white/95 backdrop-blur-md overflow-hidden">
      <mat-card-content class="!p-8 sm:!p-12 flex flex-col items-center">
        
        <!-- Icono con estilo lúdico / seguridad -->
        <div class="w-24 h-24 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 shadow-inner ring-8 ring-amber-50/50">
          <span class="material-symbols-outlined text-5xl">lock_person</span>
        </div>

        <span class="px-3.5 py-1 text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 rounded-full mb-3">
          Acceso Restringido
        </span>

        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mb-3">
          Zona no autorizada
        </h1>

        <p class="text-slate-600 text-sm sm:text-base leading-relaxed mb-8 max-w-sm">
          No cuentas con los permisos suficientes para acceder a esta área o atracción de <strong>Territorio de Niños</strong>.
        </p>

        <!-- Botones de Acción -->
        <div class="w-full flex flex-col gap-3">
          <button mat-flat-button color="primary" (click)="goToAssignedPanel()" 
                  class="!py-6 !text-base !font-bold !rounded-2xl !bg-blue-600 w-full transition-transform hover:scale-[1.01] active:scale-[0.99] !shadow-lg !shadow-blue-500/25">
            <span class="flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-lg">dashboard</span>
              Volver a mi panel asignado
            </span>
          </button>

          <button mat-stroked-button (click)="logout()" 
                  class="!py-6 !text-base !font-semibold !rounded-2xl !border-slate-200 !text-slate-600 w-full hover:!bg-slate-50 transition-colors">
            <span class="flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-lg">logout</span>
              Cerrar sesión e ingresar con otra cuenta
            </span>
          </button>
        </div>

      </mat-card-content>
    </mat-card>

    <p class="text-center text-slate-400 text-xs mt-6 font-medium">
      Territorio de Niños • Control de Seguridad y Accesos
    </p>
  </div>
</div>
  `
})
export class UnauthorizedComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  goToAssignedPanel(): void {
    const role = this.authService.getRole();
    if (role === 'ADMINISTRADOR') {
      this.router.navigate(['/admin/dashboard']);
    } else if (role === 'TAQUILLERO') {
      this.router.navigate(['/taquilla/pos']);
    } else if (role === 'OPERARIO') {
      this.router.navigate(['/operario/seleccion']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
