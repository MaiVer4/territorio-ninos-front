/**
 * Utilitario puro para formateo y manipulación de tiempos en la aplicación.
 */

/**
 * Formatea una duración en segundos a representación estándar 'MM:SS'.
 * Si el valor es negativo o no numérico, se normaliza a 0 ('00:00').
 *
 * @param totalSegundos Segundos transcurridos o restantes.
 * @returns Cadena con formato 'MM:SS' (ej. '05:30', '00:00').
 */
export function formatearMmSs(totalSegundos: number): string {
  const segundosValidos = isNaN(totalSegundos) ? 0 : Math.max(0, Math.floor(totalSegundos));
  const minutos = Math.floor(segundosValidos / 60);
  const segundos = segundosValidos % 60;
  const mm = minutos < 10 ? `0${minutos}` : `${minutos}`;
  const ss = segundos < 10 ? `0${segundos}` : `${segundos}`;
  return `${mm}:${ss}`;
}
