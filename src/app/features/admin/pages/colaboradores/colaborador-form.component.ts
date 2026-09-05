import { Component, Inject, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UsuarioService } from '../../../../core/services/usuario.service';
import { Usuario } from '../../../../core/models/usuario.model';

@Component({
  selector: 'app-colaborador-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title class="!font-bold !text-slate-800 flex items-center gap-2">
      <mat-icon>{{ isEdit() ? 'edit' : 'person_add' }}</mat-icon>
      {{ isEdit() ? 'Editar Colaborador' : 'Nuevo Colaborador' }}
    </h2>
    <mat-dialog-content class="!pt-4">
      <form [formGroup]="form" class="flex flex-col gap-4">
        
        <mat-form-field appearance="outline">
          <mat-label>Nombre Completo</mat-label>
          <input matInput formControlName="nombre" placeholder="Ej. Juan Pérez">
          <mat-error *ngIf="form.get('nombre')?.hasError('required')">Requerido</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Correo Electrónico</mat-label>
          <input matInput formControlName="correo" type="email">
          <mat-error *ngIf="form.get('correo')?.hasError('required')">Requerido</mat-error>
          <mat-error *ngIf="form.get('correo')?.hasError('email')">Formato inválido</mat-error>
        </mat-form-field>
        
        <mat-form-field appearance="outline" *ngIf="!isEdit()">
          <mat-label>Contraseña Temporal</mat-label>
          <input matInput formControlName="contrasena" type="password">
          <mat-error *ngIf="form.get('contrasena')?.hasError('required')">Requerido</mat-error>
        </mat-form-field>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="w-1/2">
            <mat-label>Rol en el Sistema</mat-label>
            <mat-select formControlName="rol">
              <mat-option value="ADMINISTRADOR">Administrador</mat-option>
              <mat-option value="TAQUILLERO">Taquillero</mat-option>
              <mat-option value="OPERARIO">Operario</mat-option>
            </mat-select>
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
export class ColaboradorFormComponent {
  private fb = inject(FormBuilder);
  private usuarioService = inject(UsuarioService);
  private dialogRef = inject(MatDialogRef<ColaboradorFormComponent>);
  
  isEdit = signal(false);
  isSaving = signal(false);
  
  form: FormGroup = this.fb.group({
    id: [null],
    nombre: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: [''], // Se hace required dinámicamente si es nuevo
    rol: ['TAQUILLERO', [Validators.required]],
    estado: ['ACTIVO', [Validators.required]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: Usuario | null) {
    if (data) {
      this.isEdit.set(true);
      this.form.patchValue(data);
      this.form.get('contrasena')?.clearValidators();
      this.form.get('contrasena')?.updateValueAndValidity();
    } else {
      this.form.get('contrasena')?.setValidators([Validators.required]);
      this.form.get('contrasena')?.updateValueAndValidity();
    }
  }

  save() {
    if (this.form.invalid) return;
    this.isSaving.set(true);
    const usuario: Usuario = this.form.value;

    const request = this.isEdit() 
      ? this.usuarioService.update(usuario.id!, usuario)
      : this.usuarioService.create(usuario);

    request.subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.dialogRef.close(res);
      },
      error: () => {
        this.isSaving.set(false);
      }
    });
  }
}
