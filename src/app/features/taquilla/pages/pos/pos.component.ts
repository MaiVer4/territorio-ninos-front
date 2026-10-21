import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { CajaService } from '../../../../core/services/caja.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ResultadoArqueoDTO, TurnoResponseDTO } from '../../../../core/models/caja.model';
import { AperturaCajaModalComponent } from '../../components/apertura-caja-modal/apertura-caja-modal.component';
import { ArqueoCajaModalComponent } from '../../components/arqueo-caja-modal/arqueo-caja-modal.component';

@Component({
  selector: 'app-taquilla-pos',
  standalone: true,
  imports: [CommonModule, AperturaCajaModalComponent, ArqueoCajaModalComponent],
  template: `
    <div class="min-h-screen bg-slate-50 font-sans flex flex-col relative">
      <!-- Modal Bloqueante de Apertura si no hay turno activo -->
      @if (mostrarModalApertura()) {
        <app-apertura-caja-modal (turnoIniciado)="onTurnoIniciado($event)"></app-apertura-caja-modal>
      }

      <!-- Modal de Arqueo y Cierre Asistido -->
      @if (mostrarModalArqueo() && turnoActual()) {
        <app-arqueo-caja-modal
          [idTurno]="turnoActual()!.idTurno"
          [montoEsperado]="montoEsperadoArqueo()"
          (confirmarArqueo)="onArqueoConfirmado($event)"
          (cancelar)="mostrarModalArqueo.set(false)">
        </app-arqueo-caja-modal>
      }

      <!-- Cabecera del POS -->
      <header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs z-10">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
            TDN
          </div>
          <div>
            <h1 class="text-sm font-bold text-slate-800">Taquilla POS • Ventas y Boletas</h1>
            <p class="text-[11px] text-slate-400">Territorio de Niños</p>
          </div>
        </div>

        <div class="flex items-center gap-3 sm:gap-4">
          @if (turnoActual(); as turno) {
            <div class="hidden lg:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-xs text-emerald-800">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span class="font-bold">Turno #{{ turno.idTurno }}</span>
              <span class="text-emerald-400">•</span>
              <span>Base: <strong>\${{ turno.montoInicial.toLocaleString('es-CO') }}</strong></span>
            </div>

            <button
              type="button"
              (click)="iniciarArqueo()"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs">
              <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Arqueo / Cerrar Caja</span>
            </button>
          }

          <div class="text-right hidden sm:block">
            <p class="text-xs font-bold text-slate-800">{{ authService.currentUser()?.correo }}</p>
            <span class="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Taquillero
            </span>
          </div>

          <button (click)="logout()"
            class="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 text-xs font-semibold rounded-xl transition cursor-pointer">
            Cerrar sesión
          </button>
        </div>
      </header>

      <!-- Contenido Principal -->
      <main class="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col justify-center items-center text-center">
        <div class="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 shadow-inner">
          <span class="material-symbols-outlined text-4xl">point_of_sale</span>
        </div>
        <h2 class="text-2xl font-extrabold text-slate-800 mb-2">Punto de Venta (POS) Operativo</h2>
        <p class="text-sm text-slate-500 max-w-md leading-relaxed mb-6">
          Has iniciado sesión con el rol <strong>TAQUILLERO</strong>. Tu estación de trabajo está sincronizada para la venta y liquidación de boletas.
        </p>

        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-xs text-slate-600 max-w-sm w-full text-left space-y-2">
          <p class="font-bold text-slate-700">Estado de la estación:</p>
          <p>• Cajero: <span class="font-mono text-slate-800">{{ authService.currentUser()?.correo }}</span></p>
          <p>• Turno de caja: 
            @if (turnoActual(); as turno) {
              <span class="font-bold text-emerald-600">ABIERTO (Turno #{{ turno.idTurno }})</span>
            } @else {
              <span class="font-bold text-amber-600">PENDIENTE DE APERTURA</span>
            }
          </p>
          <p>• Base inicial: 
            <span class="font-semibold text-slate-800">
              \${{ (turnoActual()?.montoInicial ?? 0).toLocaleString('es-CO') }} COP
            </span>
          </p>
          @if (turnoActual()) {
            <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span class="text-slate-500">Saldo teórico actual:</span>
              <span class="font-mono font-bold text-slate-800">
                \${{ montoEsperadoArqueo().toLocaleString('es-CO') }}
              </span>
            </div>
          }
        </div>
      </main>
    </div>
  `
})
export class TaquillaPosComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly cajaService = inject(CajaService);
  private readonly notificationService = inject(NotificationService, { optional: true });

  readonly mostrarModalApertura = signal<boolean>(false);
  readonly mostrarModalArqueo = signal<boolean>(false);
  readonly turnoActual = signal<TurnoResponseDTO | null>(null);

  readonly montoEsperadoArqueo = computed(() => {
    const t = this.turnoActual();
    return (t?.montoInicial ?? 0) + (t?.totalRecaudado ?? 0);
  });

  ngOnInit(): void {
    this.verificarTurnoCaja();
  }

  verificarTurnoCaja(): void {
    this.cajaService.obtenerTurnoActivo().subscribe({
      next: (turno) => {
        if (!turno || turno.estado !== 'ABIERTO') {
          this.turnoActual.set(null);
          this.mostrarModalApertura.set(true);
        } else {
          this.turnoActual.set(turno);
          this.mostrarModalApertura.set(false);
        }
      },
      error: () => {
        this.turnoActual.set(null);
        this.mostrarModalApertura.set(true);
      }
    });
  }

  onTurnoIniciado(turno: TurnoResponseDTO): void {
    this.turnoActual.set(turno);
    this.mostrarModalApertura.set(false);
  }

  iniciarArqueo(): void {
    this.mostrarModalArqueo.set(true);
  }

  onArqueoConfirmado(resultado: ResultadoArqueoDTO): void {
    this.cajaService.cerrarTurno({
      idTurno: resultado.idTurno,
      montoFinal: resultado.totalFisico,
      totalEfectivoReal: resultado.totalFisico,
      observaciones: resultado.justificacion,
      diferencia: resultado.diferencia,
      justificacion: resultado.justificacion
    }).subscribe({
      next: () => {
        this.mostrarModalArqueo.set(false);
        this.turnoActual.set(null);
        this.notificationService?.success('Arqueo de caja registrado y turno cerrado exitosamente.');
        this.mostrarModalApertura.set(true);
      },
      error: (err) => {
        const msg = err?.error?.mensaje || 'Error al procesar el cierre y arqueo de caja.';
        this.notificationService?.error(msg);
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
