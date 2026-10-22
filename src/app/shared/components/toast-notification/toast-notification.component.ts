import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { ToastData, ToastType } from '../../../core/models/toast.model';

@Component({
  selector: 'app-toast-notification',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative flex items-start gap-3.5 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 shadow-xl shadow-slate-900/10 min-w-[320px] max-w-sm sm:max-w-md overflow-hidden text-slate-800"
      [attr.role]="type === 'error' ? 'alert' : 'status'"
      [attr.aria-live]="type === 'error' ? 'assertive' : 'polite'"
    >
      <!-- Ícono Temático en Cápsula Redondeada con Acentos de Color -->
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors"
        [class]="'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ' + capsuleClasses"
      >
        @switch (type) {
          @case ('success') {
            <!-- Checkmark SVG de alta definición -->
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          }
          @case ('error') {
            <!-- X/Alerta SVG de alta definición -->
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          }
          @case ('warn') {
            <!-- Advertencia Triángulo SVG de alta definición -->
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
          @case ('info') {
            <!-- Información Círculo SVG de alta definición -->
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          }
        }
      </div>

      <!-- Contenido de Texto -->
      <div class="flex-1 min-w-0 pt-0.5">
        @if (data.title) {
          <h4 class="text-sm font-semibold text-slate-900 leading-snug tracking-tight mb-0.5 break-words">
            {{ data.title }}
          </h4>
          <p class="text-xs text-slate-600 leading-relaxed break-words">
            {{ data.message }}
          </p>
        } @else {
          <p class="text-sm font-medium text-slate-800 leading-snug break-words">
            {{ data.message }}
          </p>
        }
      </div>

      <!-- Botón de Cierre Minimalista ("×" SVG con hover suave) -->
      <button
        type="button"
        (click)="dismiss()"
        aria-label="Cerrar notificación"
        class="shrink-0 -mr-1 -mt-1 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-slate-300 active:scale-95 cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <!-- Barra de Progreso Ultra-fina (2px) Animada en la Base -->
      <div class="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-100/70 overflow-hidden rounded-b-2xl">
        <div
          class="h-full toast-progress-bar origin-left"
          [class]="'h-full toast-progress-bar origin-left ' + progressBarClass"
          [style.animationDuration.ms]="duration"
        ></div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    @keyframes toast-progress {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }

    .toast-progress-bar {
      animation-name: toast-progress;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
    }

    @media (prefers-reduced-motion: reduce) {
      .toast-progress-bar {
        animation: none;
        width: 0%;
      }
    }
  `]
})
export class ToastNotificationComponent {
  readonly data: ToastData = inject(MAT_SNACK_BAR_DATA, { optional: true }) ?? {
    message: '',
    type: 'info',
    duration: 3700
  };

  private readonly snackBarRef = inject(MatSnackBarRef, { optional: true });

  get type(): ToastType {
    return this.data?.type ?? 'info';
  }

  get duration(): number {
    return this.data?.duration ?? 3700;
  }

  get capsuleClasses(): string {
    switch (this.type) {
      case 'success':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'error':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'warn':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'info':
      default:
        return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  }

  get progressBarClass(): string {
    switch (this.type) {
      case 'success':
        return 'bg-emerald-500';
      case 'error':
        return 'bg-rose-500';
      case 'warn':
        return 'bg-amber-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  }

  dismiss(): void {
    this.snackBarRef?.dismiss();
  }
}
