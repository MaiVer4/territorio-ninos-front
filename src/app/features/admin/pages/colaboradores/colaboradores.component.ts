import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UsuarioService } from '../../../../core/services/usuario.service';
import { Usuario } from '../../../../core/models/usuario.model';
import { ColaboradorFormComponent } from './colaborador-form.component';

export interface UserRow extends Usuario {
  ultimoAcceso?: string;
}

@Component({
  selector: 'app-colaboradores',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  template: `
    <div class="w-full space-y-5 font-sans">
      <!-- Encabezado y botón nuevo usuario -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="font-bold text-slate-800 text-lg">Gestión de Usuarios</h2>
          <p class="text-xs text-slate-400 mt-0.5">{{ usuarios().length }} usuarios registrados</p>
        </div>
        <button (click)="openDialog()"
          class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer self-start sm:self-auto">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Nuevo usuario
        </button>
      </div>

      <!-- Buscador -->
      <div class="relative max-w-sm">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input [(ngModel)]="searchQuery" placeholder="Buscar usuario..."
          class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition shadow-xs" />
      </div>

      <!-- Tabla de Usuarios -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100">
                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Nombre</th>
                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Rol</th>
                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Correo</th>
                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Estado</th>
                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Último acceso</th>
                <th class="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (u of filteredUsuarios(); track u.id) {
                <tr class="hover:bg-slate-50/50 transition">
                  <!-- Nombre con Avatar -->
                  <td class="px-5 py-3.5 whitespace-nowrap">
                    <div class="flex items-center gap-2.5">
                      <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {{ getInitials(u.nombre || 'U') }}
                      </div>
                      <span class="font-semibold text-slate-800">{{ u.nombre }}</span>
                    </div>
                  </td>

                  <!-- Rol (Pills con color según rol) -->
                  <td class="px-5 py-3.5 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      [ngClass]="getRoleBadgeClass(u.rol)">
                      {{ formatRol(u.rol) }}
                    </span>
                  </td>

                  <!-- Correo -->
                  <td class="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                    {{ u.correo }}
                  </td>

                  <!-- Estado con Toggle interactivo (Permanece en la vista aunque se desactive) -->
                  <td class="px-5 py-3.5 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <button type="button" (click)="toggleEstado(u)"
                        class="w-8 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition duration-300"
                        [ngClass]="u.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-slate-300'">
                        <div class="bg-white w-4 h-4 rounded-full shadow-xs transform transition duration-300"
                          [ngClass]="u.estado === 'ACTIVO' ? 'translate-x-3' : 'translate-x-0'">
                        </div>
                      </button>
                      <span class="text-xs font-semibold"
                        [ngClass]="u.estado === 'ACTIVO' ? 'text-emerald-600' : 'text-slate-400'">
                        {{ u.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </div>
                  </td>

                  <!-- Último acceso -->
                  <td class="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                    {{ u.ultimoAcceso || 'Reciente' }}
                  </td>

                  <!-- Acciones -->
                  <td class="px-5 py-3.5 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-3">
                      <button (click)="openDialog(u)"
                        class="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition cursor-pointer">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                        </svg>
                        Editar
                      </button>
                      <button (click)="deleteUser(u)"
                        class="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 transition cursor-pointer">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          @if (filteredUsuarios().length === 0) {
            <div class="flex flex-col items-center py-12 gap-2 text-center">
              <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
              <p class="text-slate-500 text-sm font-semibold">No se encontraron usuarios</p>
              <p class="text-slate-400 text-xs">Crea el primer colaborador usando el botón superior.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class ColaboradoresComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private dialog = inject(MatDialog);

  usuarios = signal<UserRow[]>([]);
  searchQuery = signal('');

  filteredUsuarios = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.usuarios();
    return this.usuarios().filter(u =>
      (u.nombre && u.nombre.toLowerCase().includes(q)) ||
      (u.correo && u.correo.toLowerCase().includes(q)) ||
      (u.rol && u.rol.toLowerCase().includes(q))
    );
  });

  ngOnInit() {
    this.loadUsuarios();
  }

  loadUsuarios() {
    this.usuarioService.getAll().subscribe({
      next: (data) => {
        if (data) {
          const mapped: UserRow[] = data.map((u, i) => ({
            ...u,
            estado: u.estado || 'ACTIVO',
            ultimoAcceso: i === 0 ? 'Ahora' : 'Hoy'
          }));
          this.usuarios.set(mapped);
        }
      },
      error: () => {
        // En caso de que el backend no tenga conexión, lista vacía
        this.usuarios.set([]);
      }
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  formatRol(rol: string): string {
    if (rol === 'ADMINISTRADOR') return 'Administrador';
    if (rol === 'TAQUILLERO') return 'Taquillero';
    if (rol === 'OPERARIO') return 'Operario';
    return rol;
  }

  getRoleBadgeClass(rol: string): string {
    if (rol === 'ADMINISTRADOR') return 'bg-violet-50 text-violet-700 border border-violet-200';
    if (rol === 'TAQUILLERO') return 'bg-blue-50 text-blue-700 border border-blue-200';
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }

  toggleEstado(usuario: UserRow) {
    const nuevoEstado = usuario.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    // Mantiene el usuario visible en la tabla con su nuevo estado
    this.usuarios.update(list =>
      list.map(u => u.id === usuario.id ? { ...u, estado: nuevoEstado } : u)
    );
    if (usuario.id) {
      this.usuarioService.update(usuario.id, { ...usuario, estado: nuevoEstado }).subscribe({
        error: () => {}
      });
    }
  }

  openDialog(usuario?: UserRow) {
    const dialogRef = this.dialog.open(ColaboradorFormComponent, {
      width: '450px',
      panelClass: '!rounded-2xl',
      data: usuario || null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (usuario && usuario.id) {
          this.usuarios.update(list =>
            list.map(u => u.id === usuario.id ? { ...u, ...result } : u)
          );
        } else {
          this.usuarios.update(list => [...list, { ...result, id: result.id || Date.now(), ultimoAcceso: 'Ahora' }]);
        }
      }
    });
  }

  deleteUser(usuario: UserRow) {
    if (confirm(`¿Estás seguro de eliminar definitivamente a ${usuario.nombre}?`)) {
      // Solo al eliminar se remueve de la vista
      this.usuarios.update(list => list.filter(u => u.id !== usuario.id));
      if (usuario.id) {
        this.usuarioService.delete(usuario.id).subscribe({
          error: (err) => console.error('Error eliminando en backend', err)
        });
      }
    }
  }
}
