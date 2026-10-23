import { Component, DestroyRef, inject, input, model, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter, switchMap, finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Cliente, Menor } from '../../../../core/models/cliente.model';
import { ClienteService } from '../../../../core/services/cliente.service';
import { MenoresChipsComponent } from '../menores-chips/menores-chips.component';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenoresChipsComponent],
  template: `
    <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5 font-sans">
      <!-- Encabezado con estado y botón limpiar -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-inner">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-extrabold text-slate-800">Datos del Cliente / Acudiente</h3>
            <p class="text-[11px] text-slate-400">Identificación, contacto y menores asociados a la venta</p>
          </div>
        </div>

        <!-- Badges de Estado -->
        <div class="flex items-center gap-2">
          @if (buscandoCliente()) {
            <span data-testid="badge-buscando-cliente" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
              <svg class="animate-spin w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Buscando...</span>
            </span>
          } @else if (clienteEncontrado()) {
            <span data-testid="badge-cliente-encontrado" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Registrado</span>
            </span>
          } @else if (form.get('numeroDocumento')?.value?.length && form.get('numeroDocumento')!.value.length >= 5) {
            <span data-testid="badge-cliente-nuevo" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>Nuevo</span>
            </span>
          }

          <button
            type="button"
            data-testid="btn-limpiar-cliente"
            (click)="limpiar()"
            class="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer">
            Limpiar
          </button>
        </div>
      </div>

      <!-- Formulario de Datos Principales -->
      <form [formGroup]="form" (ngSubmit)="guardar()" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <!-- Documento -->
          <div>
            <label for="numeroDocumento" class="block text-xs font-bold text-slate-700 mb-1">
              Documento / Cédula <span class="text-rose-500">*</span>
            </label>
            <div class="relative">
              <input
                id="numeroDocumento"
                data-testid="input-cliente-doc"
                type="text"
                formControlName="numeroDocumento"
                placeholder="Doc. (mín. 5 dígitos)"
                class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium placeholder-slate-400 transition" />
              @if (buscandoCliente()) {
                <div class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                  <svg class="animate-spin w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              }
            </div>
            @if (form.get('numeroDocumento')?.touched && form.get('numeroDocumento')?.hasError('required')) {
              <p class="text-[10px] text-rose-500 mt-0.5">El documento es obligatorio.</p>
            }
          </div>

          <!-- Nombre Completo -->
          <div>
            <label for="nombreCompleto" class="block text-xs font-bold text-slate-700 mb-1">
              Nombre Completo <span class="text-rose-500">*</span>
            </label>
            <input
              id="nombreCompleto"
              data-testid="input-cliente-nombre"
              type="text"
              formControlName="nombreCompleto"
              placeholder="Nombre del acudiente"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium placeholder-slate-400 transition" />
            @if (form.get('nombreCompleto')?.touched && form.get('nombreCompleto')?.hasError('required')) {
              <p class="text-[10px] text-rose-500 mt-0.5">El nombre es obligatorio.</p>
            }
          </div>

          <!-- Teléfono -->
          <div>
            <label for="telefono" class="block text-xs font-bold text-slate-700 mb-1">
              Teléfono <span class="text-rose-500">*</span>
            </label>
            <input
              id="telefono"
              data-testid="input-cliente-telefono"
              type="tel"
              formControlName="telefono"
              placeholder="Ej: 3001234567"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium placeholder-slate-400 transition" />
            @if (form.get('telefono')?.touched && form.get('telefono')?.hasError('required')) {
              <p class="text-[10px] text-rose-500 mt-0.5">El teléfono es obligatorio.</p>
            }
          </div>

          <!-- Correo Electrónico -->
          <div>
            <label for="correo" class="block text-xs font-bold text-slate-700 mb-1">
              Correo Electrónico
            </label>
            <input
              id="correo"
              data-testid="input-cliente-correo"
              type="email"
              formControlName="correo"
              placeholder="correo@ejemplo.com"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium placeholder-slate-400 transition" />
            @if (form.get('correo')?.hasError('email')) {
              <p class="text-[10px] text-rose-500 mt-0.5">Formato de correo no válido.</p>
            }
          </div>
        </div>

        <!-- Componente Integrado de Menores -->
        <div class="pt-2 border-t border-slate-100">
          <app-menores-chips [menores]="menores()" (menoresChange)="menores.set($event)"></app-menores-chips>
        </div>

        <!-- Botones de Acción -->
        <div class="flex items-center justify-end gap-2.5 pt-2">
          @if (mostrarBotonCancelar()) {
            <button
              type="button"
              data-testid="btn-cancelar-cliente"
              (click)="cancelar.emit()"
              class="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer">
              Cancelar
            </button>
          }

          <button
            type="submit"
            data-testid="btn-guardar-cliente"
            [disabled]="form.invalid"
            class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Confirmar Cliente y Menores</span>
          </button>
        </div>
      </form>
    </div>
  `
})
export class ClienteFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly clienteService = inject(ClienteService);
  private readonly destroyRef = inject(DestroyRef);

  readonly clienteInicial = input<Cliente | null>(null);
  readonly mostrarBotonCancelar = model<boolean>(false);

  readonly clienteGuardado = output<Cliente>();
  readonly clienteSeleccionado = output<Cliente>();
  readonly cancelar = output<void>();

  readonly buscandoCliente = signal<boolean>(false);
  readonly clienteEncontrado = signal<boolean>(false);
  readonly menores = signal<Menor[]>([]);

  readonly form = this.fb.group({
    tipoDocumento: ['CC'],
    numeroDocumento: ['', [Validators.required, Validators.minLength(5)]],
    nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\s-]{7,15}$/)]],
    correo: ['', [Validators.email]],
    direccion: ['']
  });

  ngOnInit(): void {
    const inicial = this.clienteInicial();
    if (inicial) {
      this.cargarCliente(inicial);
    }
    this.iniciarBusquedaReactiva();
  }

  iniciarBusquedaReactiva(): void {
    this.form.get('numeroDocumento')!.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(doc => !!doc && doc.trim().length >= 5),
      switchMap(doc => {
        this.buscandoCliente.set(true);
        return this.clienteService.buscarPorDocumento(doc!.trim()).pipe(
          catchError(() => of(null)),
          finalize(() => this.buscandoCliente.set(false))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (cliente) => {
        if (cliente) {
          this.cargarCliente(cliente);
          this.clienteSeleccionado.emit(cliente);
        } else {
          this.clienteEncontrado.set(false);
        }
      }
    });
  }

  cargarCliente(cliente: Cliente): void {
    this.clienteEncontrado.set(true);
    this.form.patchValue({
      tipoDocumento: cliente.tipoDocumento ?? 'CC',
      numeroDocumento: cliente.numeroDocumento,
      nombreCompleto: cliente.nombreCompleto,
      telefono: cliente.telefono,
      correo: cliente.correo ?? '',
      direccion: cliente.direccion ?? ''
    }, { emitEvent: false });

    if (cliente.menores && cliente.menores.length) {
      this.menores.set([...cliente.menores]);
    }
  }

  limpiar(): void {
    this.form.reset({
      tipoDocumento: 'CC',
      numeroDocumento: '',
      nombreCompleto: '',
      telefono: '',
      correo: '',
      direccion: ''
    });
    this.clienteEncontrado.set(false);
    this.buscandoCliente.set(false);
    this.menores.set([]);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.getRawValue();
    const clientePayload: Cliente = {
      tipoDocumento: val.tipoDocumento,
      numeroDocumento: val.numeroDocumento.trim(),
      nombreCompleto: val.nombreCompleto.trim(),
      telefono: val.telefono.trim(),
      correo: val.correo?.trim() || undefined,
      direccion: val.direccion?.trim() || undefined,
      menores: this.menores()
    };

    this.clienteGuardado.emit(clientePayload);
  }
}
