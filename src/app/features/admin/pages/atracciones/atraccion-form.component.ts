import { Component, Inject, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { Atraccion } from '../../../../core/models/atraccion.model';

@Component({
  selector: 'app-atraccion-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col font-sans">
      <!-- Header -->
      <div class="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
        <div>
          <h2 class="font-bold text-slate-800 text-base">
            {{ isEdit() ? 'Editar Atracción' : 'Nueva Atracción' }}
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Completa todos los campos obligatorios</p>
        </div>
        <button (click)="close()" class="text-slate-300 hover:text-slate-500 transition p-1 cursor-pointer">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Formulario -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex-1 overflow-y-auto p-5 space-y-4">
        <!-- Nombre -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1.5">
            Nombre <span class="text-red-500">*</span>
          </label>
          <input type="text" formControlName="nombre" placeholder="Ej. Piscina de Pelotas"
            class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
          @if (form.get('nombre')?.touched && form.get('nombre')?.invalid) {
            <p class="text-xs text-red-500 mt-1">El nombre es requerido.</p>
          }
        </div>

        <!-- Precio y Capacidad -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
              Precio (COP) <span class="text-red-500">*</span>
            </label>
            <input type="number" formControlName="precio" min="0" step="1000"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
            @if (form.get('precio')?.value > 0) {
              <p class="text-xs text-emerald-600 mt-1 font-semibold">
                \${{ form.get('precio')?.value.toLocaleString('es-CO') }}
              </p>
            }
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
              Capacidad máxima <span class="text-red-500">*</span>
            </label>
            <input type="number" formControlName="maxCapacity" min="1" max="100"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
          </div>
        </div>

        <!-- Edad mínima y Edad máxima -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
              Edad mínima <span class="text-red-500">*</span>
            </label>
            <select formControlName="edadMin"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition">
              @for (n of ages; track n) {
                <option [value]="n">{{ n }} año{{ n > 1 ? 's' : '' }}</option>
              }
            </select>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
              Edad máxima <span class="text-red-500">*</span>
            </label>
            <select formControlName="edadMax"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition">
              @for (n of ages; track n) {
                <option [value]="n">{{ n }} año{{ n > 1 ? 's' : '' }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Alerta si edadMin > edadMax -->
        @if (form.get('edadMin')?.value > form.get('edadMax')?.value) {
          <div class="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
            <svg class="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <p class="text-xs font-semibold text-red-600">La edad mínima no puede ser mayor que la máxima.</p>
          </div>
        }

        <!-- Tipo de control (3 Tarjetas) -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1.5">
            Tipo de control <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-3 gap-2">
            @for (t of controlTypes; track t.value) {
              <button type="button" (click)="setControlType(t.value)"
                class="p-3 rounded-xl border-2 text-left transition cursor-pointer"
                [ngClass]="form.get('tipo')?.value === t.value ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'">
                <p class="text-xs font-bold"
                  [ngClass]="form.get('tipo')?.value === t.value ? 'text-blue-700' : 'text-slate-700'">
                  {{ t.label }}
                </p>
                <p class="text-[10px] text-slate-400 mt-0.5">{{ t.desc }}</p>
              </button>
            }
          </div>
        </div>

        <!-- Duración (minutos) -->
        @if (form.get('tipo')?.value !== 'falls') {
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
              Duración (minutos)
            </label>
            <input type="number" formControlName="duracion" min="0" max="480" step="5"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
            @if (form.get('duracion')?.value > 0) {
              <p class="text-xs text-slate-400 mt-1">{{ form.get('duracion')?.value }} minutos por sesión</p>
            }
          </div>
        }

        <!-- Botones de Acción -->
        <div class="pt-2 grid grid-cols-2 gap-3">
          <button type="button" (click)="close()"
            class="py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition cursor-pointer">
            Cancelar
          </button>
          <button type="submit"
            [disabled]="form.invalid || (form.get('edadMin')?.value > form.get('edadMax')?.value) || loading()"
            class="py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            {{ isEdit() ? 'Guardar cambios' : 'Crear atracción' }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class AtraccionFormComponent {
  private fb = inject(FormBuilder);
  private atraccionService = inject(AtraccionService);
  private dialogRef = inject(MatDialogRef<AtraccionFormComponent>);

  isEdit = signal(false);
  loading = signal(false);

  ages = Array.from({ length: 12 }, (_, i) => i + 1);

  controlTypes = [
    { value: 'time', label: '⏱ Por Tiempo', desc: 'Cronómetro regresivo' },
    { value: 'falls', label: '🎯 Por Caídas', desc: 'Contador de eventos' },
    { value: 'vip', label: '⭐ VIP / Acceso', desc: 'Acceso libre por tiempo' }
  ];

  form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Atraccion | null) {
    this.isEdit.set(!!data && !!data.id);

    this.form = this.fb.group({
      nombre: [data?.nombre || '', Validators.required],
      precio: [data?.precio || data?.tarifaMinuto || 10000, [Validators.required, Validators.min(0)]],
      maxCapacity: [data?.maxCapacity || data?.capacidadMaxima || 10, [Validators.required, Validators.min(1)]],
      edadMin: [data?.edadMin || 2, Validators.required],
      edadMax: [data?.edadMax || 12, Validators.required],
      tipo: [data?.tipo || 'time', Validators.required],
      duracion: [data?.duracion || data?.duracionMinutosBase || 20, Validators.required],
      estado: [data?.estado || 'ACTIVO']
    });
  }

  setControlType(tipo: string) {
    this.form.patchValue({ tipo });
  }

  onSubmit() {
    if (this.form.invalid) return;
    const val = this.form.value;
    if (val.edadMin > val.edadMax) return;

    this.loading.set(true);

    const payload: Atraccion = {
      ...this.data,
      nombre: val.nombre,
      descripcion: `${val.duracion} min · máx ${val.maxCapacity} · edad ${val.edadMin}–${val.edadMax}`,
      tarifaMinuto: val.precio,
      precio: val.precio,
      maxCapacity: val.maxCapacity,
      capacidadMaxima: val.maxCapacity,
      edadMin: val.edadMin,
      edadMax: val.edadMax,
      tipo: val.tipo,
      duracion: val.duracion,
      duracionMinutosBase: val.duracion,
      estado: val.estado || 'ACTIVO',
      tag: `${val.duracion} min · máx ${val.maxCapacity} · edad ${val.edadMin}–${val.edadMax}`
    };

    if (this.isEdit() && this.data?.id && typeof this.data.id === 'number') {
      this.atraccionService.update(this.data.id, payload).subscribe({
        next: (res) => {
          this.loading.set(false);
          this.dialogRef.close({ ...payload, ...res });
        },
        error: (err) => {
          this.loading.set(false);
          console.warn('Fallback local update', err);
          this.dialogRef.close(payload);
        }
      });
    } else {
      const numId = typeof this.data?.id === 'number' ? this.data.id : undefined;
      this.atraccionService.create(payload).subscribe({
        next: (res) => {
          this.loading.set(false);
          this.dialogRef.close({ ...payload, ...res });
        },
        error: (err) => {
          this.loading.set(false);
          console.warn('Fallback local create', err);
          this.dialogRef.close({ ...payload, id: Date.now() });
        }
      });
    }
  }

  close() {
    this.dialogRef.close();
  }
}
