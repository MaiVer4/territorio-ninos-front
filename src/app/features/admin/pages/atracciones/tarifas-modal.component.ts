import { Component, Inject, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Atraccion } from '../../../../core/models/atraccion.model';
import { TarifaService } from '../../../../core/services/tarifa.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TarifaBloque, TarifaEvento } from '../../../../core/models/tarifa.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-tarifas-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col font-sans">
      <!-- Header -->
      <div class="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="font-bold text-slate-800 text-base">Tarifario de Atracción</h2>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
              [ngClass]="data.tipo === 'EVENTOS_CAIDAS' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'">
              {{ data.tipo === 'EVENTOS_CAIDAS' ? 'Por Caídas/Eventos' : 'Por Bloques de Tiempo' }}
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">{{ data.nombre }}</p>
        </div>
        <button (click)="close()" class="text-slate-300 hover:text-slate-500 transition p-1 cursor-pointer">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Contenido / Formularios -->
      <div class="flex-1 overflow-y-auto p-5 space-y-5">
        <!-- Banner Explicativo -->
        <div class="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2.5">
          <svg class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          @if (data.tipo === 'TEMPORIZADA') {
            <p>
              <strong>HU-08:</strong> Configura los precios en pesos colombianos (COP) para los bloques de tiempo estándar (15, 30 y 60 min). Taquilla liquidará automáticamente las boletas con base en estos valores.
            </p>
          } @else {
            <p>
              <strong>HU-09:</strong> Configura los precios fijos por número de intentos o caídas para atracciones no temporizadas continuas (ej. Toro Mecánico).
            </p>
          }
        </div>

        <!-- FORMULARIO TEMPORIZADA (HU-08) -->
        @if (data.tipo === 'TEMPORIZADA') {
          <form [formGroup]="timeForm" (ngSubmit)="saveTimeRates()" class="space-y-4">
            <div class="space-y-3">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Bloques de tiempo disponibles
              </label>

              <div formArrayName="bloques" class="space-y-2.5">
                @for (bloque of bloquesArray.controls; track $index) {
                  <div [formGroupName]="$index" class="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                    <!-- Minutos -->
                    <div class="w-28 shrink-0">
                      <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Duración</label>
                      <div class="flex items-center gap-1">
                        <input type="number" formControlName="minutos" min="5" step="5"
                          class="w-full px-2 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
                        <span class="text-[11px] text-slate-500 font-medium">min</span>
                      </div>
                    </div>

                    <!-- Precio COP -->
                    <div class="flex-1 min-w-0">
                      <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Precio (COP) *</label>
                      <div class="relative">
                        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                        <input type="number" formControlName="precio" min="100" step="500" placeholder="10.000"
                          class="w-full pl-6 pr-2 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>

                    <!-- Botón Eliminar Bloque -->
                    <div class="pt-4">
                      <button type="button" (click)="removeTimeBlock($index)" [disabled]="bloquesArray.length <= 1"
                        class="text-slate-300 hover:text-red-500 disabled:opacity-20 disabled:hover:text-slate-300 p-1 cursor-pointer transition">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                }
              </div>

              <!-- Botón Agregar Bloque Personalizado -->
              <button type="button" (click)="addTimeBlock(45, 18000)"
                class="w-full py-2 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-xl text-xs font-semibold text-slate-600 hover:text-blue-600 transition flex items-center justify-center gap-1.5 cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Agregar otro bloque de tiempo
              </button>
            </div>

            <!-- Footer / Botones -->
            <div class="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
              <button type="button" (click)="close()"
                class="py-2.5 border border-slate-200 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer">
                Cancelar
              </button>
              <button type="submit" [disabled]="timeForm.invalid || saving()"
                class="py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Guardar Tarifario
              </button>
            </div>
          </form>
        }

        <!-- FORMULARIO EVENTOS / CAÍDAS (HU-09) -->
        @if (data.tipo === 'EVENTOS_CAIDAS') {
          <form [formGroup]="eventForm" (ngSubmit)="saveEventRates()" class="space-y-4">
            <div class="space-y-3">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Paquetes de caídas / intentos
              </label>

              <div formArrayName="eventos" class="space-y-2.5">
                @for (evento of eventosArray.controls; track $index) {
                  <div [formGroupName]="$index" class="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                    <div class="flex items-center gap-2.5">
                      <!-- Caídas / Intentos -->
                      <div class="w-28 shrink-0">
                        <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Caídas *</label>
                        <div class="flex items-center gap-1">
                          <input type="number" formControlName="intentos" min="1" max="20" step="1"
                            class="w-full px-2 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
                          <span class="text-[11px] text-slate-500 font-medium">caídas</span>
                        </div>
                      </div>

                      <!-- Precio COP -->
                      <div class="flex-1 min-w-0">
                        <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Precio (COP) *</label>
                        <div class="relative">
                          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                          <input type="number" formControlName="precio" min="100" step="500" placeholder="10.000"
                            class="w-full pl-6 pr-2 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
                        </div>
                      </div>

                      <!-- Botón Eliminar -->
                      <div class="pt-4">
                        <button type="button" (click)="removeEventRate($index)" [disabled]="eventosArray.length <= 1"
                          class="text-slate-300 hover:text-red-500 disabled:opacity-20 disabled:hover:text-slate-300 p-1 cursor-pointer transition">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    <!-- Descripción rápida del paquete -->
                    <div>
                      <input type="text" formControlName="descripcion" placeholder="Ej. Paquete básico de 3 caídas"
                        class="w-full px-2.5 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                }
              </div>

              <!-- Botón Agregar Paquete de Caídas -->
              <button type="button" (click)="addEventRate(5, 15000, 'Paquete extendido 5 caídas')"
                class="w-full py-2 border-2 border-dashed border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 rounded-xl text-xs font-semibold text-slate-600 hover:text-amber-700 transition flex items-center justify-center gap-1.5 cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Agregar paquete de caídas
              </button>
            </div>

            <!-- Footer / Botones -->
            <div class="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
              <button type="button" (click)="close()"
                class="py-2.5 border border-slate-200 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer">
                Cancelar
              </button>
              <button type="submit" [disabled]="eventForm.invalid || saving()"
                class="py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Guardar Tarifas de Evento
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `
})
export class TarifasModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<TarifasModalComponent>);
  private tarifaService = inject(TarifaService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  saving = signal(false);

  timeForm: FormGroup = this.fb.group({
    bloques: this.fb.array([])
  });

  eventForm: FormGroup = this.fb.group({
    eventos: this.fb.array([])
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: Atraccion) {}

  get bloquesArray(): FormArray {
    return this.timeForm.get('bloques') as FormArray;
  }

  get eventosArray(): FormArray {
    return this.eventForm.get('eventos') as FormArray;
  }

  ngOnInit() {
    if (this.data.tipo === 'TEMPORIZADA') {
      this.initTimeBlocks();
    } else {
      this.initEventRates();
    }
  }

  initTimeBlocks() {
    // Bloques estándar base: 15, 30 y 60 minutos (HU-08)
    const baseTarifa = this.data.tarifaMinuto || this.data.precio || 500;
    this.addTimeBlock(15, Math.round(baseTarifa * 15));
    this.addTimeBlock(30, Math.round(baseTarifa * 30));
    this.addTimeBlock(60, Math.round(baseTarifa * 55)); // descuento por hora
  }

  initEventRates() {
    // Paquetes estándar por evento / caídas (HU-09)
    const basePrecio = this.data.precio || this.data.tarifaMinuto || 10000;
    const caidas = this.data.caidasLimite || 3;
    this.addEventRate(caidas, basePrecio, `Paquete estándar ${caidas} caídas`);
  }

  addTimeBlock(minutos: number, precio: number) {
    this.bloquesArray.push(
      this.fb.group({
        atraccionId: [this.data.id || 0],
        minutos: [minutos, [Validators.required, Validators.min(5)]],
        precio: [precio, [Validators.required, Validators.min(100)]],
        vigente: [true]
      })
    );
  }

  removeTimeBlock(index: number) {
    if (this.bloquesArray.length > 1) {
      this.bloquesArray.removeAt(index);
    }
  }

  addEventRate(intentos: number, precio: number, descripcion: string) {
    this.eventosArray.push(
      this.fb.group({
        atraccionId: [this.data.id || 0],
        intentos: [intentos, [Validators.required, Validators.min(1)]],
        precio: [precio, [Validators.required, Validators.min(100)]],
        descripcion: [descripcion],
        vigente: [true]
      })
    );
  }

  removeEventRate(index: number) {
    if (this.eventosArray.length > 1) {
      this.eventosArray.removeAt(index);
    }
  }

  saveTimeRates() {
    if (this.timeForm.invalid) return;
    this.saving.set(true);
    const bloques: TarifaBloque[] = this.timeForm.value.bloques;

    const requests$ = bloques.map(b => this.tarifaService.saveTarifaBloque(b));
    forkJoin(requests$)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (guardados) => {
          this.saving.set(false);
          this.notificationService.success('Tarifas por tiempo actualizadas correctamente.');
          this.dialogRef.close({ tipo: 'TEMPORIZADA', bloques: guardados });
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err.error?.mensaje || 'Error al actualizar las tarifas por tiempo.';
          this.notificationService.error(msg);
        }
      });
  }

  saveEventRates() {
    if (this.eventForm.invalid) return;
    this.saving.set(true);
    const eventos: TarifaEvento[] = this.eventForm.value.eventos;

    const requests$ = eventos.map(e => this.tarifaService.saveTarifaEvento(e));
    forkJoin(requests$)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (guardados) => {
          this.saving.set(false);
          this.notificationService.success('Tarifas por evento actualizadas correctamente.');
          this.dialogRef.close({ tipo: 'EVENTOS_CAIDAS', eventos: guardados });
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err.error?.mensaje || 'Error al actualizar las tarifas por evento.';
          this.notificationService.error(msg);
        }
      });
  }

  close() {
    this.dialogRef.close();
  }
}
