import { Component, Inject, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { Atraccion } from '../../../../core/models/atraccion.model';

@Component({
  selector: 'app-atraccion-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title class="!font-bold !text-slate-800 flex items-center gap-2">
      <mat-icon>{{ isEdit() ? 'edit' : 'add_circle' }}</mat-icon>
      {{ isEdit() ? 'Editar Atracción' : 'Nueva Atracción' }}
    </h2>
    <mat-dialog-content class="!pt-4">
      <form [formGroup]="form" class="flex flex-col gap-4">
        <mat-form-field appearance="outline">
          <mat-label>Nombre de la Atracción</mat-label>
          <input matInput formControlName="nombre" placeholder="Ej. Inflable Castillo">
          <mat-error *ngIf="form.get('nombre')?.hasError('required')">Requerido</mat-error>
        </mat-form-field>
        
        <mat-form-field appearance="outline">
          <mat-label>Descripción</mat-label>
          <textarea matInput formControlName="descripcion" rows="3"></textarea>
          <mat-error *ngIf="form.get('descripcion')?.hasError('required')">Requerido</mat-error>
        </mat-form-field>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="w-1/2">
            <mat-label>Tarifa por Minuto ($)</mat-label>
            <input matInput type="number" formControlName="tarifaMinuto" min="0" step="0.01">
            <mat-error *ngIf="form.get('tarifaMinuto')?.hasError('required')">Requerido</mat-error>
            <mat-error *ngIf="form.get('tarifaMinuto')?.hasError('min')">Mínimo 0</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-1/2">
            <mat-label>Estado</mat-label>
            <mat-select formControlName="estado">
              <mat-option value="ACTIVO">Activo</mat-option>
              <mat-option value="INACTIVO">Inactivo</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="!px-6 !pb-6">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || isSaving()" (click)="save()">
        {{ isSaving() ? 'Guardando...' : 'Guardar' }}
      </button>
    </mat-dialog-actions>
  `
})
export class AtraccionFormComponent {
  private fb = inject(FormBuilder);
  private atraccionService = inject(AtraccionService);
  private dialogRef = inject(MatDialogRef<AtraccionFormComponent>);
  
  isEdit = signal(false);
  isSaving = signal(false);
  
  form: FormGroup = this.fb.group({
    id: [null],
    nombre: ['', [Validators.required]],
    descripcion: ['', [Validators.required]],
    tarifaMinuto: [0, [Validators.required, Validators.min(0)]],
    estado: ['ACTIVO', [Validators.required]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: Atraccion | null) {
    if (data) {
      this.isEdit.set(true);
      this.form.patchValue(data);
    }
  }

  save() {
    if (this.form.invalid) return;
    this.isSaving.set(true);
    const atraccion: Atraccion = this.form.value;

    const request = this.isEdit() 
      ? this.atraccionService.update(atraccion.id!, atraccion)
      : this.atraccionService.create(atraccion);

    request.subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.dialogRef.close(res);
      },
      error: () => {
        this.isSaving.set(false);
        // Podríamos mostrar un snackbar aquí
      }
    });
  }
}
