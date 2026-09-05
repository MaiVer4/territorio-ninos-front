import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UsuarioService } from '../../../../core/services/usuario.service';
import { Usuario } from '../../../../core/models/usuario.model';
import { ColaboradorFormComponent } from './colaborador-form.component';

@Component({
  selector: 'app-colaboradores',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Colaboradores</h1>
          <p class="text-slate-500 text-sm">Administra los accesos y roles del personal.</p>
        </div>
        <button mat-flat-button color="primary" class="!rounded-xl" (click)="openDialog()">
          <mat-icon>person_add</mat-icon> Nuevo Colaborador
        </button>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl">
        <table mat-table [dataSource]="usuarios()" class="w-full">
          <!-- Nombre Column -->
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef class="font-semibold text-slate-700 bg-slate-50">Nombre</th>
            <td mat-cell *matCellDef="let element" class="font-medium text-slate-800"> {{element.nombre}} </td>
          </ng-container>

          <!-- Correo Column -->
          <ng-container matColumnDef="correo">
            <th mat-header-cell *matHeaderCellDef class="font-semibold text-slate-700 bg-slate-50">Correo</th>
            <td mat-cell *matCellDef="let element" class="text-slate-600"> {{element.correo}} </td>
          </ng-container>

          <!-- Rol Column -->
          <ng-container matColumnDef="rol">
            <th mat-header-cell *matHeaderCellDef class="font-semibold text-slate-700 bg-slate-50">Rol</th>
            <td mat-cell *matCellDef="let element">
              <span class="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {{element.rol}}
              </span>
            </td>
          </ng-container>
          
          <!-- Estado Column -->
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef class="font-semibold text-slate-700 bg-slate-50">Estado</th>
            <td mat-cell *matCellDef="let element">
              <span class="px-3 py-1 rounded-full text-xs font-semibold"
                    [ngClass]="element.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                {{element.estado}}
              </span>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef class="font-semibold text-slate-700 bg-slate-50 text-right pr-4">Acciones</th>
            <td mat-cell *matCellDef="let element" class="text-right pr-4">
              <button mat-icon-button color="primary" (click)="openDialog(element)" title="Editar">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="delete(element)" title="Desactivar">
                <mat-icon>person_off</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-slate-50 transition-colors"></tr>
        </table>
        
        <div *ngIf="usuarios().length === 0" class="p-8 text-center text-slate-500">
          No hay colaboradores registrados.
        </div>
      </div>
    </div>
  `
})
export class ColaboradoresComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private dialog = inject(MatDialog);

  usuarios = signal<Usuario[]>([]);
  displayedColumns: string[] = ['nombre', 'correo', 'rol', 'estado', 'acciones'];

  ngOnInit() {
    this.loadUsuarios();
  }

  loadUsuarios() {
    this.usuarioService.getAll().subscribe({
      next: (data) => this.usuarios.set(data),
      error: (err) => console.error('Error cargando usuarios', err)
    });
  }

  openDialog(usuario?: Usuario) {
    const dialogRef = this.dialog.open(ColaboradorFormComponent, {
      width: '500px',
      data: usuario || null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadUsuarios();
      }
    });
  }

  delete(usuario: Usuario) {
    if (confirm(`¿Estás seguro de inhabilitar/eliminar a ${usuario.nombre}?`)) {
      this.usuarioService.delete(usuario.id!).subscribe({
        next: () => this.loadUsuarios(),
        error: (err) => console.error('Error eliminando', err)
      });
    }
  }
}
