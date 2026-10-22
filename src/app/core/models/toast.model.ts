export type ToastType = 'success' | 'error' | 'warn' | 'info';

export interface ToastData {
  message: string;
  title?: string;
  type: ToastType;
  duration?: number;
}
