import { formatearMmSs } from './time.utils';

describe('time.utils', () => {
  it('should format seconds into MM:SS correctly', () => {
    expect(formatearMmSs(0)).toBe('00:00');
    expect(formatearMmSs(9)).toBe('00:09');
    expect(formatearMmSs(59)).toBe('00:59');
    expect(formatearMmSs(60)).toBe('01:00');
    expect(formatearMmSs(90)).toBe('01:30');
    expect(formatearMmSs(900)).toBe('15:00');
  });

  it('should handle negative numbers and NaN by normalizing to 00:00', () => {
    expect(formatearMmSs(-10)).toBe('00:00');
    expect(formatearMmSs(NaN)).toBe('00:00');
  });

  it('should format minutes >= 10 with two digits', () => {
    expect(formatearMmSs(605)).toBe('10:05');
  });
});
