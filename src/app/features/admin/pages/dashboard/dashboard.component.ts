import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <h1 class="text-3xl font-bold text-slate-800 mb-2">Dashboard Administrador</h1>
      <p class="text-slate-600">¡Bienvenido al panel de control principal!</p>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <!-- Tarjetas de resumen simuladas -->
        <div class="p-6 rounded-xl bg-blue-50 border border-blue-100">
          <h3 class="text-blue-800 font-semibold mb-1">Atracciones Activas</h3>
          <p class="text-3xl font-bold text-blue-600">12</p>
        </div>
        <div class="p-6 rounded-xl bg-indigo-50 border border-indigo-100">
          <h3 class="text-indigo-800 font-semibold mb-1">Colaboradores</h3>
          <p class="text-3xl font-bold text-indigo-600">8</p>
        </div>
        <div class="p-6 rounded-xl bg-emerald-50 border border-emerald-100">
          <h3 class="text-emerald-800 font-semibold mb-1">Ingresos de Hoy</h3>
          <p class="text-3xl font-bold text-emerald-600">$450K</p>
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardComponent {
}
