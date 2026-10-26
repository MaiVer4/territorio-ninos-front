/**
 * Extrae las iniciales en mayúsculas de un nombre completo.
 * Si tiene 2 o más palabras, devuelve las primeras letras de las primeras dos.
 * Si tiene 1 palabra, devuelve hasta 2 letras.
 * Si está vacío o nulo, devuelve el valor por defecto provisto (o 'U').
 */
export function extractInitials(name?: string | null, fallback = 'U'): string {
  if (!name || !name.trim()) {
    return fallback;
  }

  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length > 0) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return fallback;
}
