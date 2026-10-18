import { describe, expect, it } from 'vitest';
import { calculate, initialInputs } from './calibration';
import { formatDistance, fromMm, inputsForDisplay, inputToMm, parseInches } from './units';

describe('display units and fractional inches', () => {
  it.each([
    ['3/8', 0.375], ['42 3/8', 42.375], [' 1 / 2 ', 0.5],
    ['-2 1/4', -2.25], ['.5', 0.5], ['0', 0], ['2.50', 2.5],
  ])('parses %s', (text, expected) => {
    expect(parseInches(text)).toBe(expected);
    expect(Number(inputToMm(text, 'in'))).toBeCloseTo(expected * 25.4, 10);
  });
  it.each(['1/0', '3/', 'hello', '1/2/3', '1.5/2', '', 'Infinity', '1e3'])('rejects invalid inch input %j', (text) => {
    expect(Number.isNaN(parseInches(text))).toBe(true);
  });
  it('converts exact inches and preserves blank fields', () => {
    expect(fromMm(25.4, 'in')).toBe(1);
    expect(inputToMm('', 'in')).toBe('');
    expect(inputToMm('1.2500', 'mm')).toBe('1.2500');
    expect(inputsForDisplay(initialInputs, 'in').diagonalA).toBe('');
  });
  it('formats inches to four decimal places', () => {
    expect(formatDistance(25.4, 'in')).toBe((1).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }));
  });
  it('does not mutate canonical measurements during repeated display conversions', () => {
    const inputs = { ...initialInputs, width: '1000.123456789' };
    for (let i = 0; i < 100; i++) {
      inputsForDisplay(inputs, 'in');
      expect(inputsForDisplay(inputs, 'mm').width).toBe('1000.123456789');
    }
  });
  it('produces the same geometry from fractional inches and millimeters', () => {
    const metric = { width: '1016', length: '1016', switchSpan: '1270',
      diagonalA: '1435.1', diagonalB: '1435.1', tolerance: '0.79375' };
    const converted = { ...metric, width: inputToMm('40', 'in'), length: inputToMm('40', 'in'),
      switchSpan: inputToMm('50', 'in'), diagonalA: inputToMm('56 1/2', 'in'),
      diagonalB: inputToMm('56 1/2', 'in'), tolerance: inputToMm('1/32', 'in') };
    expect(calculate(converted)).toEqual(calculate(metric));
  });
});
