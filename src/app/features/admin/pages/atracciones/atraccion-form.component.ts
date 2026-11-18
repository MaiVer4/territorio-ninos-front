import {
  Component,
  Inject,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  signal,
  DestroyRef,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AtraccionService } from '../../../../core/services/atraccion.service';
import { TarifaService } from '../../../../core/services/tarifa.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Atraccion, TarifaEventoCatalogo, TarifaTiempoCatalogo } from '../../../../core/models/atraccion.model';
import { TarifaBloque, TarifaEvento } from '../../../../core/models/tarifa.model';
import { TipoAtraccion } from '../../../../core/models/enums';

@Component({
  selector: 'app-atraccion-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[92vh] flex flex-col font-sans motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95">
      <!-- Header -->
      <div class="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
        <div>
          <h2 class="font-bold text-slate-800 text-base">
            {{ isEdit() ? 'Editar Atracción y Tarifas' : 'Nueva Atracción y Tarifas' }}
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Configura los datos generales y las tarifas de venta en un solo lugar</p>
        </div>
        <button type="button" (click)="close()" class="text-slate-300 hover:text-slate-500 transition p-1 cursor-pointer">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Formulario Unificado -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
        <!-- Nombre y Capacidad Máxima -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="sm:col-span-2">
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
              Nombre <span class="text-red-500">*</span>
            </label>
            <input type="text" formControlName="nombre" placeholder="Ej. Piscina de Pelotas"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
            @if (form.get('nombre')?.touched && form.get('nombre')?.invalid) {
              <p class="text-xs text-red-500 mt-1">El nombre es requerido.</p>
            }
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
              Capacidad máx. <span class="text-red-500">*</span>
            </label>
            <input type="number" formControlName="capacidadMaxima" min="1" max="500"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
          </div>
        </div>

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

        <!-- SECCIÓN INTEGRADA DE TARIFAS -->
        <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3" [attr.data-version]="tarifasVersion()">
          <div class="flex items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Tarifas y Modalidades de Venta
                </h3>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  [ngClass]="form.get('tipo')?.value === 'EVENTOS_CAIDAS' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'">
                  {{ form.get('tipo')?.value === 'EVENTOS_CAIDAS' ? 'Por Caídas / Intentos' : 'Por Minutos' }}
                </span>
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5">
                @if (form.get('tipo')?.value === 'TEMPORIZADA') {
                  Define libremente los minutos y el precio (COP) de cada opción que aparecerá en Taquilla.
                } @else {
                  Define libremente la cantidad de caídas/intentos y el precio (COP) de cada paquete.
                }
              </p>
            </div>
          </div>

          @if (cargandoTarifas()) {
            <div class="py-4 text-center text-xs text-slate-400 font-medium">
              Cargando tarifas configuradas...
            </div>
          } @else if (form.get('tipo')?.value === 'TEMPORIZADA') {
            <!-- TARIFAS POR TIEMPO (MINUTOS Y PRECIOS LIBRES) -->
            <div [formGroup]="timeForm" class="space-y-2.5">
              <div formArrayName="bloques" class="space-y-2">
                @for (bloque of bloquesArray.controls; track $index) {
                  <div [formGroupName]="$index"
                    class="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
                    <!-- Minutos libres -->
                    <div class="w-28 shrink-0">
                      <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Minutos *</label>
                      <div class="flex items-center gap-1">
                        <input type="number" formControlName="minutos" min="1" step="1"
                          (input)="onTarifasChanged()"
                          class="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
                        <span class="text-[11px] text-slate-500 font-medium">min</span>
                      </div>
                    </div>

                    <!-- Precio libre COP -->
                    <div class="flex-1 min-w-0">
                      <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Precio (COP) *</label>
                      <div class="relative">
                        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                        <input type="number" formControlName="precio" min="1" step="100" placeholder="15000"
                          (input)="onTarifasChanged()"
                          class="w-full pl-6 pr-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>

                    <!-- Eliminar bloque -->
                    <div class="pt-4">
                      <button type="button" (click)="removeTimeBlock($index)"
                        [disabled]="bloquesArray.length <= 1"
                        title="Eliminar tarifa"
                        class="text-slate-400 hover:text-red-500 disabled:opacity-25 disabled:hover:text-slate-400 p-1.5 cursor-pointer transition rounded-lg hover:bg-red-50">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                }
              </div>

              <button type="button" (click)="addCustomTimeBlock()"
                class="w-full py-2 border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/50 rounded-xl text-xs font-semibold text-slate-600 hover:text-blue-600 transition flex items-center justify-center gap-1.5 cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Agregar tarifa por tiempo
              </button>
            </div>
          } @else {
            <!-- TARIFAS POR EVENTOS / CAÍDAS (INTENTOS Y PRECIOS LIBRES) -->
            <div [formGroup]="eventForm" class="space-y-2.5">
              <div formArrayName="eventos" class="space-y-2">
                @for (evento of eventosArray.controls; track $index) {
                  <div [formGroupName]="$index"
                    class="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2 shadow-2xs">
                    <div class="flex items-center gap-2.5">
                      <!-- Caídas / Intentos libres -->
                      <div class="w-28 shrink-0">
                        <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Caídas *</label>
                        <div class="flex items-center gap-1">
                          <input type="number" formControlName="intentos" min="1" step="1"
                            (input)="onTarifasChanged()"
                            class="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
                          <span class="text-[11px] text-slate-500 font-medium">caídas</span>
                        </div>
                      </div>

                      <!-- Precio libre COP -->
                      <div class="flex-1 min-w-0">
                        <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Precio (COP) *</label>
                        <div class="relative">
                          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                          <input type="number" formControlName="precio" min="1" step="100" placeholder="10000"
                            (input)="onTarifasChanged()"
                            class="w-full pl-6 pr-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
                        </div>
                      </div>

                      <!-- Eliminar paquete -->
                      <div class="pt-4">
                        <button type="button" (click)="removeEventRate($index)"
                          [disabled]="eventosArray.length <= 1"
                          title="Eliminar paquete"
                          class="text-slate-400 hover:text-red-500 disabled:opacity-25 disabled:hover:text-slate-400 p-1.5 cursor-pointer transition rounded-lg hover:bg-red-50">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div>
                      <input type="text" formControlName="descripcion" placeholder="Descripción opcional (ej. Paquete de 3 caídas)"
                        class="w-full px-2.5 py-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                }
              </div>

              <button type="button" (click)="addCustomEventRate()"
                class="w-full py-2 border-2 border-dashed border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/50 rounded-xl text-xs font-semibold text-slate-600 hover:text-amber-700 transition flex items-center justify-center gap-1.5 cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Agregar paquete de caídas
              </button>
            </div>
          }
        </div>

        <!-- Margen de Tolerancia -->
        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-bold text-slate-700">
              Margen de tolerancia / tiempo de gracia
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
            class="py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-transform duration-150 ease-out enabled:active:scale-[0.96] cursor-pointer">
            Cancelar
          </button>
          <button type="submit"
            [disabled]="form.invalid || isTarifarioInvalido() || loading()"
            class="py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-transform duration-150 ease-out enabled:active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm cursor-pointer">
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
export class AtraccionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private atraccionService = inject(AtraccionService);
  private tarifaService = inject(TarifaService, { optional: true });
  private notificationService = inject(NotificationService);
  private dialogRef = inject(MatDialogRef<AtraccionFormComponent>);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  isEdit = signal(false);
  loading = signal(false);
  cargandoTarifas = signal(false);
  tarifasVersion = signal(0);

  private tarifasModificadasManualmente = false;
  private bloquesOriginales: TarifaBloque[] = [];
  private eventosOriginales: TarifaEvento[] = [];

  controlTypes: { value: TipoAtraccion; label: string; desc: string }[] = [
    { value: 'TEMPORIZADA', label: '⏱ Por Tiempo', desc: 'Cronómetro regresivo por sesión' },
    { value: 'EVENTOS_CAIDAS', label: '🎯 Por Caídas', desc: 'Contador de eventos / caídas' }
  ];

  form: FormGroup;
  timeForm: FormGroup = this.fb.group({
    bloques: this.fb.array([])
  });
  eventForm: FormGroup = this.fb.group({
    eventos: this.fb.array([])
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: Atraccion | null) {
    this.isEdit.set(!!data && !!data.id);

    const tipoVal: TipoAtraccion = (data?.tipo === 'EVENTOS_CAIDAS' || (data?.tipo as unknown) === 'falls')
      ? 'EVENTOS_CAIDAS'
      : 'TEMPORIZADA';

    this.form = this.fb.group({
      nombre: [data?.nombre || '', Validators.required],
      tarifaMinuto: [data?.tarifaMinuto || data?.precio || 1000, [Validators.required, Validators.min(0.01)]],
      capacidadMaxima: [data?.capacidadMaxima || data?.maxCapacity || 10, [Validators.required, Validators.min(1)]],
      tipo: [tipoVal, Validators.required],
      duracionMinutosBase: [data?.duracionMinutosBase || data?.duracion || 15, Validators.required],
      toleranciaMinutos: [data?.toleranciaMinutos ?? 1, [Validators.required, Validators.min(0), Validators.max(10)]],
      caidasLimite: [data?.caidasLimite || 3],
      estado: [data?.estado || 'ACTIVO']
    });
  }

  get bloquesArray(): FormArray {
    return this.timeForm.get('bloques') as FormArray;
  }

  get eventosArray(): FormArray {
    return this.eventForm.get('eventos') as FormArray;
  }

  ngOnInit(): void {
    // 1. Si data ya trae tarifas precargadas en la tarjeta, mostrarlas al instante
    if (this.data?.tarifasTiempo && this.data.tarifasTiempo.length > 0) {
      this.bloquesArray.clear();
      this.bloquesOriginales = this.data.tarifasTiempo.map(t => ({
        id: t.id,
        atraccionId: this.data?.id || 0,
        minutos: t.duracionMinutos,
        precio: t.precio,
        vigente: t.activo ?? t.vigente ?? true
      }));
      this.bloquesOriginales.forEach(b => this.addTimeBlock(b.minutos, b.precio, b.id, b.vigente ?? true));
    }
    if (this.data?.tarifasEvento && this.data.tarifasEvento.length > 0) {
      this.eventosArray.clear();
      this.eventosOriginales = this.data.tarifasEvento.map(e => ({
        id: e.id,
        atraccionId: this.data?.id || 0,
        intentos: e.intentos,
        precio: e.precio,
        descripcion: `Paquete ${e.intentos} caídas`,
        vigente: e.activo ?? e.vigente ?? true
      }));
      this.eventosOriginales.forEach(e => this.addEventRate(e.intentos, e.precio, e.descripcion || '', e.id, e.vigente ?? true));
    }

    // 2. Consultar siempre al servidor cuando se edita una atracción existente para tener los IDs y precios reales
    const req$ = this.data?.id != null && typeof this.tarifaService?.getTarifasByAtraccion === 'function'
      ? this.tarifaService.getTarifasByAtraccion(this.data.id)
      : undefined;

    if (req$) {
      if (this.bloquesArray.length === 0 && this.eventosArray.length === 0) {
        this.cargandoTarifas.set(true);
      }
      req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (tarifario) => {
          this.cargandoTarifas.set(false);
          if (tarifario?.bloques && tarifario.bloques.length > 0) {
            const ordenados = [...tarifario.bloques].sort((a, b) => a.minutos - b.minutos);
            this.bloquesOriginales = ordenados;
            this.bloquesArray.clear();
            ordenados.forEach(b => this.addTimeBlock(b.minutos, b.precio, b.id, b.vigente ?? true));
          } else if (this.bloquesArray.length === 0) {
            this.initDefaultTimeBlocks();
          }

          if (tarifario?.eventos && tarifario.eventos.length > 0) {
            const ordenadosEv = [...tarifario.eventos].sort((a, b) => a.intentos - b.intentos);
            this.eventosOriginales = ordenadosEv;
            this.eventosArray.clear();
            ordenadosEv.forEach(e => this.addEventRate(e.intentos, e.precio, e.descripcion || '', e.id, e.vigente ?? true));
          } else if (this.eventosArray.length === 0) {
            this.initDefaultEventRates();
          }

          this.refrescarVistaTarifas();
        },
        error: () => {
          this.cargandoTarifas.set(false);
          this.asegurarTarifasPorDefecto();
          this.refrescarVistaTarifas();
        }
      });
    } else {
      this.asegurarTarifasPorDefecto();
      this.refrescarVistaTarifas();
    }
  }

  private asegurarTarifasPorDefecto(): void {
    if (this.bloquesArray.length === 0) {
      this.initDefaultTimeBlocks();
    }
    if (this.eventosArray.length === 0) {
      this.initDefaultEventRates();
    }
  }

  private initDefaultTimeBlocks(): void {
    const duracionBase = Number(this.form.get('duracionMinutosBase')?.value || this.data?.duracionMinutosBase || 15);
    const tarifaMin = Number(this.form.get('tarifaMinuto')?.value || this.data?.tarifaMinuto || 1000);
    const precioBase = Math.max(100, Math.round(tarifaMin * duracionBase));
    this.addTimeBlock(duracionBase, precioBase);
  }

  private initDefaultEventRates(): void {
    const caidas = Number(this.form.get('caidasLimite')?.value || this.data?.caidasLimite || 3);
    const precioBase = Number(this.form.get('tarifaMinuto')?.value || this.data?.precio || 10000);
    this.addEventRate(caidas, Math.max(100, precioBase), `Paquete ${caidas} caídas`);
  }

  addTimeBlock(minutos: number, precio: number, id?: number | string, vigente = true): void {
    this.bloquesArray.push(
      this.fb.group({
        id: [id],
        atraccionId: [this.data?.id || 0],
        minutos: [minutos, [Validators.required, Validators.min(1)]],
        precio: [precio, [Validators.required, Validators.min(1)]],
        vigente: [vigente]
      })
    );
    this.refrescarVistaTarifas();
  }

  addCustomTimeBlock(): void {
    this.tarifasModificadasManualmente = true;
    const actuales = this.bloquesArray.value as TarifaBloque[];
    const maxMin = actuales.reduce((max, b) => Math.max(max, Number(b.minutos) || 0), 0);
    const ultimoPrecio = actuales.length > 0 ? Number(actuales[actuales.length - 1].precio) || 15000 : 15000;
    const siguienteMin = maxMin > 0 ? maxMin + 15 : 15;
    this.addTimeBlock(siguienteMin, ultimoPrecio + 5000);
    this.sincronizarCamposBaseDesdeTarifas();
  }

  removeTimeBlock(index: number): void {
    if (this.bloquesArray.length <= 1) return;
    this.tarifasModificadasManualmente = true;
    this.bloquesArray.removeAt(index);
    this.sincronizarCamposBaseDesdeTarifas();
    this.refrescarVistaTarifas();
  }

  addEventRate(intentos: number, precio: number, descripcion: string, id?: number | string, vigente = true): void {
    this.eventosArray.push(
      this.fb.group({
        id: [id],
        atraccionId: [this.data?.id || 0],
        intentos: [intentos, [Validators.required, Validators.min(1)]],
        precio: [precio, [Validators.required, Validators.min(1)]],
        descripcion: [descripcion],
        vigente: [vigente]
      })
    );
    this.refrescarVistaTarifas();
  }

  addCustomEventRate(): void {
    this.tarifasModificadasManualmente = true;
    const actuales = this.eventosArray.value as TarifaEvento[];
    const maxIntentos = actuales.reduce((max, e) => Math.max(max, Number(e.intentos) || 0), 0);
    const ultimoPrecio = actuales.length > 0 ? Number(actuales[actuales.length - 1].precio) || 10000 : 10000;
    const siguienteIntentos = maxIntentos > 0 ? maxIntentos + 2 : 3;
    this.addEventRate(siguienteIntentos, ultimoPrecio + 5000, `Paquete ${siguienteIntentos} caídas`);
    this.sincronizarCamposBaseDesdeTarifas();
  }

  removeEventRate(index: number): void {
    if (this.eventosArray.length <= 1) return;
    this.tarifasModificadasManualmente = true;
    this.eventosArray.removeAt(index);
    this.sincronizarCamposBaseDesdeTarifas();
    this.refrescarVistaTarifas();
  }

  onTarifasChanged(): void {
    this.tarifasModificadasManualmente = true;
    this.sincronizarCamposBaseDesdeTarifas();
  }

  private sincronizarCamposBaseDesdeTarifas(): void {
    const tipo = this.form.get('tipo')?.value;
    if (tipo === 'TEMPORIZADA' && this.bloquesArray.length > 0) {
      const bloques = (this.bloquesArray.value as TarifaBloque[])
        .filter(b => Number(b.minutos) > 0 && Number(b.precio) > 0)
        .sort((a, b) => Number(a.minutos) - Number(b.minutos));
      if (bloques.length > 0) {
        const primero = bloques[0];
        const min = Math.max(1, Number(primero.minutos));
        const precio = Math.max(1, Number(primero.precio));
        const tarifaPorMin = Math.max(1, Math.round(precio / min));
        this.form.patchValue({
          duracionMinutosBase: min,
          tarifaMinuto: tarifaPorMin
        }, { emitEvent: false });
      }
    } else if (tipo === 'EVENTOS_CAIDAS' && this.eventosArray.length > 0) {
      const eventos = (this.eventosArray.value as TarifaEvento[])
        .filter(e => Number(e.intentos) > 0 && Number(e.precio) > 0)
        .sort((a, b) => Number(a.intentos) - Number(b.intentos));
      if (eventos.length > 0) {
        const primero = eventos[0];
        this.form.patchValue({
          caidasLimite: Math.max(1, Number(primero.intentos)),
          tarifaMinuto: Math.max(1, Number(primero.precio))
        }, { emitEvent: false });
      }
    }
  }

  isTarifarioInvalido(): boolean {
    const tipo = this.form.get('tipo')?.value;
    if (tipo === 'TEMPORIZADA') {
      return this.bloquesArray.length > 0 && this.timeForm.invalid;
    }
    return this.eventosArray.length > 0 && this.eventForm.invalid;
  }

  private refrescarVistaTarifas(): void {
    this.tarifasVersion.update(v => v + 1);
    this.cdr.markForCheck();
  }

  setControlType(tipo: TipoAtraccion) {
    this.form.patchValue({ tipo });
    this.asegurarTarifasPorDefecto();
    this.refrescarVistaTarifas();
  }

  onSubmit() {
    if (this.form.invalid || this.isTarifarioInvalido()) return;
    if (this.tarifasModificadasManualmente) {
      this.sincronizarCamposBaseDesdeTarifas();
    }

    const val = this.form.value;
    this.loading.set(true);

    const tipoVal: TipoAtraccion = val.tipo === 'EVENTOS_CAIDAS' ? 'EVENTOS_CAIDAS' : 'TEMPORIZADA';
    const tarifaMinuto = Number(val.tarifaMinuto);
    const capacidadMaxima = Number(val.capacidadMaxima);
    const duracionMinutosBase = Number(val.duracionMinutosBase || 15);
    const toleranciaMinutos = Number(val.toleranciaMinutos || 0);
    const caidasLimite = Number(val.caidasLimite || 3);

    const tagDesc = tipoVal === 'EVENTOS_CAIDAS'
      ? `${caidasLimite} caídas · máx ${capacidadMaxima}`
      : `${duracionMinutosBase} min · máx ${capacidadMaxima}`;

    const payload: Atraccion = {
      ...this.data,
      nombre: val.nombre,
      descripcion: tagDesc,
      tarifaMinuto,
      capacidadMaxima,
      duracionMinutosBase,
      toleranciaMinutos,
      caidasLimite,
      tipo: tipoVal,
      estado: val.estado || 'ACTIVO',
      precio: tarifaMinuto,
      maxCapacity: capacidadMaxima,
      duracion: duracionMinutosBase,
      tag: tagDesc
    };

    const guardarAtraccion$: Observable<Atraccion> =
      this.isEdit() && this.data?.id && typeof this.data.id === 'number'
        ? this.atraccionService.update(this.data.id, payload)
        : this.atraccionService.create(payload);

    guardarAtraccion$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resAtraccion) => {
          const atraccionId = resAtraccion?.id ?? this.data?.id;
          const tarifasLocales = this.construirResumenTarifasLocales(atraccionId, tipoVal);
          const resultadoCerrado: Atraccion = {
            ...payload,
            ...resAtraccion,
            ...tarifasLocales
          };
          this.sincronizarTarifasEnServidor(atraccionId, tipoVal).subscribe((tarifasServidor) => {
            if (tarifasServidor.tarifasTiempo) {
              resultadoCerrado.tarifasTiempo = tarifasServidor.tarifasTiempo;
            }
            if (tarifasServidor.tarifasEvento) {
              resultadoCerrado.tarifasEvento = tarifasServidor.tarifasEvento;
            }
          });

          this.loading.set(false);
          const accion = this.isEdit() ? 'actualizada' : 'creada';
          this.notificationService.success(
            this.isEdit()
              ? `Atracción ${val.nombre} ${accion} correctamente.`
              : `Atracción ${val.nombre} ${accion} exitosamente.`
          );
          this.dialogRef.close(resultadoCerrado);
        },
        error: (err) => {
          this.loading.set(false);
          const defaultMsg = this.isEdit()
            ? 'Error al actualizar la atracción en el servidor.'
            : 'Error al crear la atracción en el servidor.';
          const msg = err.error?.detalles || err.error?.mensaje || defaultMsg;
          this.notificationService.error(msg);
        }
      });
  }

  private construirResumenTarifasLocales(
    atraccionId: number | string | undefined,
    tipo: TipoAtraccion
  ): { tarifasTiempo?: TarifaTiempoCatalogo[]; tarifasEvento?: TarifaEventoCatalogo[] } {
    const idNum = Number(atraccionId || 0);
    if (tipo === 'TEMPORIZADA') {
      const tarifasTiempo: TarifaTiempoCatalogo[] = (this.bloquesArray.value as TarifaBloque[])
        .map((b, idx) => ({
          id: Number(b.id ?? idx + 1),
          atraccionId: idNum,
          duracionMinutos: Math.max(1, Number(b.minutos)),
          precio: Math.max(1, Number(b.precio)),
          activo: b.vigente ?? true,
          vigente: b.vigente ?? true
        }))
        .sort((a, b) => a.duracionMinutos - b.duracionMinutos);
      return { tarifasTiempo };
    }
    const tarifasEvento: TarifaEventoCatalogo[] = (this.eventosArray.value as TarifaEvento[])
      .map((e, idx) => ({
        id: Number(e.id ?? idx + 1),
        atraccionId: idNum,
        intentos: Math.max(1, Number(e.intentos)),
        precio: Math.max(1, Number(e.precio)),
        activo: e.vigente ?? true,
        vigente: e.vigente ?? true
      }))
      .sort((a, b) => a.intentos - b.intentos);
    return { tarifasEvento };
  }

  private sincronizarTarifasEnServidor(
    atraccionId: number | string | undefined,
    tipo: TipoAtraccion
  ): Observable<{ tarifasTiempo?: TarifaTiempoCatalogo[]; tarifasEvento?: TarifaEventoCatalogo[] }> {
    if (!atraccionId || typeof atraccionId !== 'number' || !this.tarifaService) {
      return of({});
    }

    if (tipo === 'TEMPORIZADA' && typeof this.tarifaService.saveTarifaBloque === 'function') {
      // Deduplicar bloques por cantidad de minutos y reutilizar ID original si coincide en minutos
      const mapaPorMinutos = new Map<number, TarifaBloque>();
      for (const raw of this.bloquesArray.value as TarifaBloque[]) {
        const min = Math.max(1, Number(raw.minutos));
        const precio = Math.max(1, Number(raw.precio));
        const originalConMismosMinutos = this.bloquesOriginales.find(o => Number(o.minutos) === min);
        const idFinal = raw.id ?? originalConMismosMinutos?.id;
        mapaPorMinutos.set(min, {
          id: idFinal,
          atraccionId,
          minutos: min,
          precio,
          vigente: raw.vigente ?? true
        });
      }
      const bloquesActuales = Array.from(mapaPorMinutos.values()).sort((a, b) => a.minutos - b.minutos);
      const idsConservados = new Set(bloquesActuales.map(b => b.id).filter(id => id != null));

      const eliminaciones$: Observable<unknown>[] =
        typeof this.tarifaService.deleteTarifaBloque === 'function'
          ? this.bloquesOriginales
              .filter(o => o.id != null && !idsConservados.has(o.id))
              .map(o => this.tarifaService!.deleteTarifaBloque(o.id!).pipe(catchError(() => of(null))))
          : [];

      const ejecutarGuardados$ = () => {
        if (bloquesActuales.length === 0) return of({ tarifasTiempo: [] });
        const guardados$ = bloquesActuales.map(b =>
          this.tarifaService!.saveTarifaBloque(b).pipe(catchError(() => of(b)))
        );
        return forkJoin(guardados$).pipe(
          switchMap((bloquesGuardados) => {
            const tarifasTiempo: TarifaTiempoCatalogo[] = bloquesGuardados.map((b, idx) => ({
              id: Number(b.id ?? idx + 1),
              atraccionId: Number(atraccionId),
              duracionMinutos: b.minutos,
              precio: b.precio,
              activo: b.vigente ?? true,
              vigente: b.vigente ?? true
            }));
            return of({ tarifasTiempo });
          })
        );
      };

      if (eliminaciones$.length > 0) {
        return forkJoin(eliminaciones$).pipe(switchMap(() => ejecutarGuardados$()));
      }
      return ejecutarGuardados$();
    }

    if (tipo === 'EVENTOS_CAIDAS' && typeof this.tarifaService.saveTarifaEvento === 'function') {
      const mapaPorIntentos = new Map<number, TarifaEvento>();
      for (const raw of this.eventosArray.value as TarifaEvento[]) {
        const intentos = Math.max(1, Number(raw.intentos));
        const precio = Math.max(1, Number(raw.precio));
        const originalConMismosIntentos = this.eventosOriginales.find(o => Number(o.intentos) === intentos);
        const idFinal = raw.id ?? originalConMismosIntentos?.id;
        mapaPorIntentos.set(intentos, {
          id: idFinal,
          atraccionId,
          intentos,
          precio,
          descripcion: raw.descripcion || `Paquete ${intentos} caídas`,
          vigente: raw.vigente ?? true
        });
      }
      const eventosActuales = Array.from(mapaPorIntentos.values()).sort((a, b) => a.intentos - b.intentos);
      const idsConservados = new Set(eventosActuales.map(e => e.id).filter(id => id != null));

      const eliminaciones$: Observable<unknown>[] =
        typeof this.tarifaService.deleteTarifaEvento === 'function'
          ? this.eventosOriginales
              .filter(o => o.id != null && !idsConservados.has(o.id))
              .map(o => this.tarifaService!.deleteTarifaEvento(o.id!).pipe(catchError(() => of(null))))
          : [];

      const ejecutarGuardados$ = () => {
        if (eventosActuales.length === 0) return of({ tarifasEvento: [] });
        const guardados$ = eventosActuales.map(e =>
          this.tarifaService!.saveTarifaEvento(e).pipe(catchError(() => of(e)))
        );
        return forkJoin(guardados$).pipe(
          switchMap((eventosGuardados) => {
            const tarifasEvento: TarifaEventoCatalogo[] = eventosGuardados.map((e, idx) => ({
              id: Number(e.id ?? idx + 1),
              atraccionId: Number(atraccionId),
              intentos: e.intentos,
              precio: e.precio,
              activo: e.vigente ?? true,
              vigente: e.vigente ?? true
            }));
            return of({ tarifasEvento });
          })
        );
      };

      if (eliminaciones$.length > 0) {
        return forkJoin(eliminaciones$).pipe(switchMap(() => ejecutarGuardados$()));
      }
      return ejecutarGuardados$();
    }

    return of({});
  }

  close() {
    this.dialogRef.close();
  }
}
