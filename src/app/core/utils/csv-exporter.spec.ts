import { describe, it, expect, vi } from 'vitest';
import { sanitizeCsvCell, exportToCsv } from './csv-exporter';

describe('CSV Exporter Utility', () => {
  describe('sanitizeCsvCell', () => {
    it('should return empty quotes for null or undefined', () => {
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });

    it('should wrap regular text in quotes', () => {
      expect(sanitizeCsvCell('Territorio')).toBe('"Territorio"');
      expect(sanitizeCsvCell(123)).toBe('"123"');
    });

    it('should escape double quotes inside text as double-quotes RFC 4180', () => {
      expect(sanitizeCsvCell('Piscina de "pelotas"')).toBe('"Piscina de ""pelotas"""');
    });

    it('should sanitize formula injection prefixes (=, +, -, @)', () => {
      expect(sanitizeCsvCell('=1+1')).toBe('"\x27=1+1"');
      expect(sanitizeCsvCell('+SUM(A1:A5)')).toBe('"\x27+SUM(A1:A5)"');
      expect(sanitizeCsvCell('-cmd|...')).toBe('"\x27-cmd|..."');
      expect(sanitizeCsvCell('@calc')).toBe('"\x27@calc"');
    });
  });

  describe('exportToCsv', () => {
    it('should trigger browser download with blob and anchor element', () => {
      const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      let clicked = false;
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === 'a') {
          el.click = () => { clicked = true; };
        }
        return el;
      });

      exportToCsv('test_export', ['ID', 'Nombre'], [['1', 'Atracción A']]);

      expect(createObjectUrlSpy).toHaveBeenCalled();
      expect(clicked).toBe(true);
      expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:mock-url');

      createObjectUrlSpy.mockRestore();
      revokeObjectUrlSpy.mockRestore();
      vi.restoreAllMocks();
    });
  });
});
