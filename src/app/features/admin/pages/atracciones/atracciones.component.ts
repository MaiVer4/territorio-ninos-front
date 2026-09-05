import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { Atraccion } from '../../../../core/models/atraccion.model';
import { AtraccionFormComponent } from './atraccion-form.component';

@Component({
  selector: 'app-atracciones',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Atracciones</h1>
          <p class="text-slate-500 text-sm">Gestiona las atracciones y sus tarifas por minuto.</p>
        </div>
        <button mat-flat-button color="primary" class="!rounded-xl" (click)="openDialog()">
          <mat-icon>add</mat-icon> Nueva Atracción
        </button>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl">
        <table mat-table [dataSource]="atracciones()" class="w-full">
          <!-- Nombre Column -->
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef class="font-semibold text-slate-700 bg-slate-50">Nombre</th>
            <td mat-cell *matCellDef="let element" class="font-medium text-slate-800"> {{element.nombre}} </td>
          </ng-container>

          <!-- Tarifa Column -->
          <ng-container matColumnDef="tarifaMinuto">
            <th mat-header-cell *matHeaderCellDef class="font-semibold text-slate-700 bg-slate-50">Tarifa/Minuto</th>
            <td mat-cell *matCellDef="let element" class="text-slate-600"> {{element.tarifaMinuto | currency}} </td>
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
              <button mat-icon-button color="warn" (click)="delete(element)" title="Desactivar/Eliminar">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-slate-50 transition-colors"></tr>
        </table>
        
        <div *ngIf="atracciones().length === 0" class="p-8 text-center text-slate-500">
          No hay atracciones registradas.
        </div>
      </div>
    </div>
  `
})
export class AtraccionesComponent implements OnInit {
  private atraccionService = inject(AtraccionService);
  private dialog = inject(MatDialog);

  atracciones = signal<Atraccion[]>([]);
  displayedColumns: string[] = ['nombre', 'tarifaMinuto', 'estado', 'acciones'];

  ngOnInit() {
    this.loadAtracciones();
  }

  loadAtracciones() {
    this.atraccionService.getAll().subscribe({
      next: (data) => this.atracciones.set(data),
      error: (err) => console.error('Error cargando atracciones', err)
    });
  }

  openDialog(atraccion?: Atraccion) {
    const dialogRef = this.dialog.open(AtraccionFormComponent, {
      width: '500px',
      data: atraccion || null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAtracciones();
      }
    });
  }

  delete(atraccion: Atraccion) {
    if (confirm(`¿Estás seguro de eliminar la atracción ${atraccion.nombre}?`)) {
      this.atraccionService.delete(atraccion.id!).subscribe({
        next: () => this.loadAtracciones(),
        error: (err) => console.error('Error eliminando', err)
      });
    }
  }
}
