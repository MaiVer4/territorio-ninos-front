/**
 * Utilidad segura para exportación de datos a formato CSV.
 * Aplica protección contra vulnerabilidad de Formula Injection (OWASP / CWE-1236)
 * y formateo estricto compatible con RFC 4180 y Microsoft Excel.
 */

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Prevenir ejecución de fórmulas maliciosas en hojas de cálculo (=, +, -, @, tabulación o retorno)
  if (/^[=+@\-\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escapar comillas dobles conforme al estándar RFC 4180
  return `"${str.replace(/"/g, '""')}"`;
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]): void {
  const csvRows = [
    headers.map(h => sanitizeCsvCell(h)).join(','),
    ...rows.map(row => row.map(cell => sanitizeCsvCell(cell)).join(','))
  ];

  // BOM UTF-8 (\uFEFF) para que Excel reconozca caracteres en español (tildes, ñ) sin corrupción
  const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });

  if (typeof window !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
