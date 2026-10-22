import { Component, OnInit, inject, signal, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfiguracionService } from '../../../../core/services/configuracion.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfiguracionParque } from '../../../../core/models/configuracion.model';
import { TicketPreviewComponent } from './ticket-preview.component';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, TicketPreviewComponent],
  template: `
    <div class="w-full space-y-5 font-sans">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="font-bold text-slate-800 text-lg">Parámetros del Parque y Boletas Térmicas</h2>
          <p class="text-xs text-slate-400 mt-0.5">Configuración institucional e impresión de boletas para taquilla</p>
        </div>

        <button (click)="onSubmit()" [disabled]="form.invalid || saving()"
          class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer self-start sm:self-auto">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          {{ saving() ? 'Guardando cambios...' : 'Guardar Configuración' }}
        </button>
      </div>

      <!-- Layout 2 Columnas: Formulario + Live Preview -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- Columna 1: Formulario Reactivo (7 Cols) -->
        <div class="lg:col-span-7 space-y-5">
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            
            <!-- Tarjeta 1: Información Legal e Institucional -->
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div class="border-b border-slate-100 pb-3">
                <h3 class="font-bold text-slate-800 text-sm">Datos del Establecimiento</h3>
                <p class="text-[11px] text-slate-400">Información legal que se imprimirá en el encabezado de las boletas</p>
              </div>

              <!-- Nombre Comercial y Razón Social -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre comercial <span class="text-red-500">*</span>
                  </label>
                  <input type="text" formControlName="nombreComercial" placeholder="Territorio de Niños"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
                  @if (form.get('nombreComercial')?.touched && form.get('nombreComercial')?.invalid) {
                    <p class="text-[10px] text-red-500 mt-1">El nombre comercial es obligatorio.</p>
                  }
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">
                    Razón social <span class="text-red-500">*</span>
                  </label>
                  <input type="text" formControlName="razonSocial" placeholder="Territorio de Niños S.A.S."
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
                  @if (form.get('razonSocial')?.touched && form.get('razonSocial')?.invalid) {
                    <p class="text-[10px] text-red-500 mt-1">La razón social es obligatoria.</p>
                  }
                </div>
              </div>

              <!-- NIT y Teléfono -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">
                    NIT con DV <span class="text-red-500">*</span>
                  </label>
                  <input type="text" formControlName="nit" placeholder="901.458.789-2"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
                  @if (form.get('nit')?.touched && form.get('nit')?.invalid) {
                    <p class="text-[10px] text-red-500 mt-1">El NIT es obligatorio.</p>
                  }
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono de contacto <span class="text-red-500">*</span>
                  </label>
                  <input type="text" formControlName="telefono" placeholder="+57 310 456 7890"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <!-- Dirección y Ciudad -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">
                    Dirección física <span class="text-red-500">*</span>
                  </label>
                  <input type="text" formControlName="direccion" placeholder="Av. Bolívar # 14N-55"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
                  @if (form.get('direccion')?.touched && form.get('direccion')?.invalid) {
                    <p class="text-[10px] text-red-500 mt-1">La dirección es obligatoria.</p>
                  }
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">
                    Ciudad y Departamento <span class="text-red-500">*</span>
                  </label>
                  <input type="text" formControlName="ciudad" placeholder="Armenia, Quindío"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>

            <!-- Tarjeta 2: Formato Térmico y Normas de Seguridad -->
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div class="border-b border-slate-100 pb-3">
                <h3 class="font-bold text-slate-800 text-sm">Formato Térmico y Políticas de Seguridad</h3>
                <p class="text-[11px] text-slate-400">Reglas impresas al pie de los tickets para validez legal y advertencias</p>
              </div>

              <!-- Formato de Impresión -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ancho de papel de impresora térmica
                </label>
                <div class="grid grid-cols-2 gap-3">
                  <label class="flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition"
                    [ngClass]="form.get('anchoPapelMm')?.value === 58 ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200'">
                    <input type="radio" formControlName="anchoPapelMm" [value]="58" class="text-blue-600" />
                    <div>
                      <p class="text-xs font-bold text-slate-800">58 mm</p>
                      <p class="text-[10px] text-slate-400">Impresoras portátiles / compactas</p>
                    </div>
                  </label>

                  <label class="flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition"
                    [ngClass]="form.get('anchoPapelMm')?.value === 80 ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200'">
                    <input type="radio" formControlName="anchoPapelMm" [value]="80" class="text-blue-600" />
                    <div>
                      <p class="text-xs font-bold text-slate-800">80 mm</p>
                      <p class="text-[10px] text-slate-400">Estándar POS taquilla</p>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Políticas y Advertencias de Seguridad -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Políticas de seguridad impresas <span class="text-red-500">*</span>
                </label>
                <textarea formControlName="politicasSeguridad" rows="3"
                  placeholder="Uso obligatorio de medias antideslizantes. Prohibido alimentos y bebidas..."
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"></textarea>
                @if (form.get('politicasSeguridad')?.touched && form.get('politicasSeguridad')?.invalid) {
                  <p class="text-[10px] text-red-500 mt-1">Las políticas de seguridad son obligatorias.</p>
                }
              </div>

              <!-- Mensaje de Pie -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Mensaje de despedida en el pie <span class="text-red-500">*</span>
                </label>
                <input type="text" formControlName="mensajePie" placeholder="¡Gracias por su visita a Territorio de Niños!"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            <!-- Tarjeta 3: Operación del Parque y Tolerancia de Tiempo -->
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div class="border-b border-slate-100 pb-3">
                <h3 class="font-bold text-slate-800 text-sm">Operación del Parque y Tolerancia de Tiempo</h3>
                <p class="text-[11px] text-slate-400">Margen de gracia operativo concedido a atracciones temporizadas antes de emitir alertas</p>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="block text-xs font-semibold text-slate-700">
                    Margen de gracia general <span class="text-red-500">*</span>
                  </label>
                  <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                    {{ form.get('tiempoGraciaGeneralSegundos')?.value ?? 0 }} segundos
                  </span>
                </div>

                <div class="relative">
                  <input type="number" formControlName="tiempoGraciaGeneralSegundos" min="0" max="600" step="5"
                    placeholder="60"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
                  <span class="absolute right-3 top-2 text-[11px] text-slate-400 font-medium">seg</span>
                </div>

                <!-- Botones de selección rápida -->
                <div class="flex flex-wrap items-center gap-2 mt-2.5">
                  <span class="text-[10px] text-slate-400 font-medium">Atajos rápidos:</span>
                  @for (sec of [30, 60, 90, 120]; track sec) {
                    <button type="button" (click)="setTiempoGracia(sec)"
                      [class]="form.get('tiempoGraciaGeneralSegundos')?.value === sec ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                      class="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer">
                      {{ sec }}s
                    </button>
                  }
                </div>

                <p class="text-[11px] text-slate-400 mt-2">
                  Tiempo de tolerancia tras cumplirse los minutos contratados antes de marcar sobretiempo en pantalla del operario y semáforo de aforo.
                </p>

                @if (form.get('tiempoGraciaGeneralSegundos')?.touched && form.get('tiempoGraciaGeneralSegundos')?.invalid) {
                  <p class="text-[10px] text-red-500 mt-1">El tiempo de gracia es obligatorio y debe ser mayor o igual a 0 segundos.</p>
                }
              </div>
            </div>
          </form>
        </div>

        <!-- Columna 2: Simulador Live de Boleta Térmica (5 Cols Sticky) -->
        <div class="lg:col-span-5 sticky top-6">
          <div class="bg-slate-100/70 border border-slate-200 rounded-2xl p-5 flex flex-col items-center shadow-xs">
            <div class="flex items-center gap-2 mb-4 text-xs font-bold text-slate-700">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Vista Previa en Vivo de Boleta Térmica POS
            </div>
            
            <app-ticket-preview [config]="previewConfig()"></app-ticket-preview>
          </div>
        </div>

      </div>
    </div>
  `
})
export class ConfiguracionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private configuracionService = inject(ConfiguracionService);
  private notificationService = inject(NotificationService);

  private destroyRef = inject(DestroyRef);

  saving = signal(false);

  form: FormGroup = this.fb.group({
    id: [1],
    nombreComercial: ['Territorio de Niños', Validators.required],
    razonSocial: ['Territorio de Niños S.A.S.', Validators.required],
    nit: ['901.458.789-2', Validators.required],
    direccion: ['Av. Bolívar # 14N-55', Validators.required],
    telefono: ['+57 310 456 7890', Validators.required],
    ciudad: ['Armenia, Quindío', Validators.required],
    politicasSeguridad: [
      'Uso obligatorio de medias antideslizantes.\nProhibido el ingreso de alimentos y bebidas.\nEl parque no se hace responsable por objetos olvidados.',
      Validators.required
    ],
    anchoPapelMm: [80, Validators.required],
    mensajePie: ['¡Gracias por su visita a Territorio de Niños!', Validators.required],
    tiempoGraciaGeneralSegundos: [60, [Validators.required, Validators.min(0)]]
  });

  previewConfig = signal<ConfiguracionParque>(this.form.value);

  ngOnInit() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        this.previewConfig.set(val);
      });

    this.cargarConfiguracion();
  }

  setTiempoGracia(segundos: number) {
    this.form.patchValue({ tiempoGraciaGeneralSegundos: segundos });
    this.form.get('tiempoGraciaGeneralSegundos')?.markAsDirty();
  }

  cargarConfiguracion() {
    this.configuracionService.getConfiguracion()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (data) {
            this.form.patchValue(data);
            this.previewConfig.set(this.form.value);
          }
        },
        error: () => {
          // En caso de que no exista aún en BD, mantiene los defaults iniciales
        }
      });
  }

  onSubmit() {
    // Escenario 2 HU-13: Campos obligatorios vacíos
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificationService.error('Debes completar todos los campos obligatorios del establecimiento.');
      return;
    }

    this.saving.set(true);
    const formVal = this.form.value;
    const config: ConfiguracionParque = {
      ...formVal,
      nombreParque: formVal.nombreComercial,
      pieTicketLegal: formVal.politicasSeguridad
    };

    // Escenario 1 HU-13: Actualización exitosa en backend
    this.configuracionService.updateConfiguracion(config)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.previewConfig.set(res || config);
          this.notificationService.success('Parámetros del parque y boletas guardados exitosamente.');
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err.error?.mensaje || 'Error al guardar los parámetros en el servidor. Verifica tu conexión.';
          this.notificationService.error(msg);
        }
      });
  }
}
