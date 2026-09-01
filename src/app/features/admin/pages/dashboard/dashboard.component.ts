import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 class="text-4xl font-bold text-blue-700 mb-4">Dashboard Administrador</h1>
      <p class="text-xl">¡Bienvenido! Has iniciado sesión correctamente.</p>
      <button (click)="logout()" class="mt-8 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Cerrar Sesión</button>
    </div>
  `
})
export class AdminDashboardComponent {
  private authService = inject(AuthService);
  logout() { this.authService.logout(); }
}
