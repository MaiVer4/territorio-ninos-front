import { Component, Inject, inject, ChangeDetectionStrategy, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Atraccion } from '../../../../core/models/atraccion.model';
import { TipoAtraccion } from '../../../../core/models/enums';

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

        <!-- Tarifa por Minuto y Capacidad Máxima -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
              Tarifa por minuto (COP) <span class="text-red-500">*</span>
            </label>
            <input type="number" formControlName="tarifaMinuto" min="0.01" step="100"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
            @if (form.get('tarifaMinuto')?.value > 0) {
              <p class="text-xs text-emerald-600 mt-1 font-semibold">
                \${{ form.get('tarifaMinuto')?.value.toLocaleString('es-CO') }}/min
              </p>
            }
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
              Capacidad máxima <span class="text-red-500">*</span>
            </label>
            <input type="number" formControlName="capacidadMaxima" min="1" max="100"
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

        <!-- Tipo de control (2 Tarjetas canónicas) -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1.5">
            Tipo de atracción <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 gap-2">
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

        <!-- Duración Base (minutos) si es TEMPORIZADA -->
        @if (form.get('tipo')?.value === 'TEMPORIZADA') {
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
              Duración base (minutos) <span class="text-red-500">*</span>
            </label>
            <input type="number" formControlName="duracionMinutosBase" min="1" max="480" step="5"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
            @if (form.get('duracionMinutosBase')?.value > 0) {
              <p class="text-xs text-slate-400 mt-1">{{ form.get('duracionMinutosBase')?.value }} minutos por sesión base</p>
            }
          </div>
        } @else {
          <!-- Caídas Límite si es EVENTOS_CAIDAS -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
              Límite de caídas / eventos <span class="text-red-500">*</span>
            </label>
            <input type="number" formControlName="caidasLimite" min="1" max="50" step="1"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
            <p class="text-xs text-slate-400 mt-1">Máximo de intentos o caídas permitidas antes de finalizar</p>
          </div>
        }

        <!-- Margen de Tolerancia (HU-12 / RF12) -->
        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-bold text-slate-700">
              Margen de tolerancia / tiempo de gracia (HU-12)
            </label>
            <span class="text-xs font-bold text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-md">
              {{ form.get('toleranciaMinutos')?.value ?? 0 }} min
            </span>
          </div>
          <input type="range" formControlName="toleranciaMinutos" min="0" max="5" step="1"
            class="w-full accent-blue-600 cursor-pointer" />
          <div class="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>0 min (Alarma inmediata)</span>
            <span>2 min</span>
            <span>5 min (Máx. permitido)</span>
          </div>
          <p class="text-[11px] text-slate-500 mt-1.5">
            Tiempo adicional concedido para desalojo antes de activar la alarma sonora de tiempo agotado.
          </p>
        </div>

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
  private notificationService = inject(NotificationService);
  private dialogRef = inject(MatDialogRef<AtraccionFormComponent>);
  private destroyRef = inject(DestroyRef);

  isEdit = signal(false);
  loading = signal(false);

  ages = Array.from({ length: 12 }, (_, i) => i + 1);

  controlTypes: { value: TipoAtraccion; label: string; desc: string }[] = [
    { value: 'TEMPORIZADA', label: '⏱ Por Tiempo', desc: 'Cronómetro regresivo por sesión' },
    { value: 'EVENTOS_CAIDAS', label: '🎯 Por Caídas', desc: 'Contador de eventos / caídas' }
  ];

  form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Atraccion | null) {
    this.isEdit.set(!!data && !!data.id);

    const tipoVal: TipoAtraccion = (data?.tipo === 'EVENTOS_CAIDAS' || (data?.tipo as any) === 'falls')
      ? 'EVENTOS_CAIDAS'
      : 'TEMPORIZADA';

    this.form = this.fb.group({
      nombre: [data?.nombre || '', Validators.required],
      tarifaMinuto: [data?.tarifaMinuto || data?.precio || 1000, [Validators.required, Validators.min(0.01)]],
      capacidadMaxima: [data?.capacidadMaxima || data?.maxCapacity || 10, [Validators.required, Validators.min(1)]],
      edadMin: [data?.edadMin || 2, Validators.required],
      edadMax: [data?.edadMax || 12, Validators.required],
      tipo: [tipoVal, Validators.required],
      duracionMinutosBase: [data?.duracionMinutosBase || data?.duracion || 15, Validators.required],
      toleranciaMinutos: [data?.toleranciaMinutos ?? 1, [Validators.required, Validators.min(0), Validators.max(10)]],
      caidasLimite: [data?.caidasLimite || 3],
      estado: [data?.estado || 'ACTIVO']
    });
  }

  setControlType(tipo: TipoAtraccion) {
    this.form.patchValue({ tipo });
  }

  onSubmit() {
    if (this.form.invalid) return;
    const val = this.form.value;
    if (val.edadMin > val.edadMax) return;

    this.loading.set(true);

    const tipoVal: TipoAtraccion = val.tipo === 'EVENTOS_CAIDAS' ? 'EVENTOS_CAIDAS' : 'TEMPORIZADA';
    const tarifaMinuto = Number(val.tarifaMinuto);
    const capacidadMaxima = Number(val.capacidadMaxima);
    const duracionMinutosBase = Number(val.duracionMinutosBase || 15);
    const toleranciaMinutos = Number(val.toleranciaMinutos || 0);
    const caidasLimite = Number(val.caidasLimite || 3);

    const payload: Atraccion = {
      ...this.data,
      nombre: val.nombre,
      descripcion: `${duracionMinutosBase} min · máx ${capacidadMaxima} · edad ${val.edadMin}–${val.edadMax}`,
      tarifaMinuto,
      capacidadMaxima,
      duracionMinutosBase,
      toleranciaMinutos,
      caidasLimite,
      tipo: tipoVal,
      estado: val.estado || 'ACTIVO',
      // Propiedades de UI y aliases
      precio: tarifaMinuto,
      maxCapacity: capacidadMaxima,
      duracion: duracionMinutosBase,
      edadMin: val.edadMin,
      edadMax: val.edadMax,
      tag: `${duracionMinutosBase} min · máx ${capacidadMaxima} · edad ${val.edadMin}–${val.edadMax}`
    };

    if (this.isEdit() && this.data?.id && typeof this.data.id === 'number') {
      this.atraccionService.update(this.data.id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.loading.set(false);
            this.notificationService.success(`Atracción ${val.nombre} actualizada correctamente.`);
            this.dialogRef.close({ ...payload, ...res });
          },
          error: (err) => {
            this.loading.set(false);
            const msg = err.error?.mensaje || 'Error al actualizar la atracción en el servidor.';
            this.notificationService.error(msg);
          }
        });
    } else {
      this.atraccionService.create(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.loading.set(false);
            this.notificationService.success(`Atracción ${val.nombre} creada exitosamente.`);
            this.dialogRef.close({ ...payload, ...res });
          },
          error: (err) => {
            this.loading.set(false);
            const msg = err.error?.mensaje || 'Error al crear la atracción en el servidor.';
            this.notificationService.error(msg);
          }
        });
    }
  }

  close() {
    this.dialogRef.close();
  }
}
