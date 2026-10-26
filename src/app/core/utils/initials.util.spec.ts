import { extractInitials } from './initials.util';

describe('extractInitials', () => {
  it('should return 2 letters for two words', () => {
    expect(extractInitials('Carlos Gómez')).toBe('CG');
  });

  it('should return up to 2 letters for single word', () => {
    expect(extractInitials('María')).toBe('MA');
    expect(extractInitials('M')).toBe('M');
  });

  it('should return fallback for empty or whitespace strings', () => {
    expect(extractInitials('')).toBe('U');
    expect(extractInitials('   ')).toBe('U');
    expect(extractInitials(null)).toBe('U');
    expect(extractInitials(undefined, 'OP')).toBe('OP');
  });
});
