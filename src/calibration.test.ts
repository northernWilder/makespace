import { describe, expect, it } from 'vitest';
import { calculate, correctionDirection, initialInputs, type CalibrationInputs } from './calibration';

function synthetic(offset: number, overrides: Partial<CalibrationInputs> = {}): CalibrationInputs {
  const width = Number(overrides.width ?? '1000');
  const length = Number(overrides.length ?? '1500');
  const span = Number(overrides.switchSpan ?? '1250');
  const sinAngle = offset / span;
  return {
    ...initialInputs,
    ...overrides,
    width: String(width),
    length: String(length),
    switchSpan: String(span),
    diagonalA: String(Math.sqrt(width ** 2 + length ** 2 + 2 * width * length * sinAngle)),
    diagonalB: String(Math.sqrt(width ** 2 + length ** 2 - 2 * width * length * sinAngle)),
  };
}

describe('gantry squaring geometry', () => {
  it('states correction direction relative to the back of the machine', () => {
    expect(correctionDirection(1)).toBe('forward, away from the back of the machine (+X)');
    expect(correctionDirection(-1)).toBe('backward, toward the back of the machine (−X)');
    expect(correctionDirection(0)).toBe('no movement');
  });
  it('waits for both actual diagonal measurements', () => {
    expect(calculate(initialInputs)).toEqual({ status: 'incomplete' });
  });
  it('returns zero correction for a square rectangle', () => {
    const result = calculate(synthetic(0));
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') throw new Error('Expected valid result');
    expect(result.adjustment).toBe(0);
    expect(result.withinTolerance).toBe(true);
    expect(result.geometryWarning).toBe(false);
  });
  it.each([2.5, -2.5, 0.01, -0.01, 12])('recovers %s mm left trigger correction from synthetic skew', (offset) => {
    const result = calculate(synthetic(offset));
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') throw new Error('Expected valid result');
    expect(result.adjustment).toBeCloseTo(offset, 8);
    expect(result.geometryWarning).toBe(false);
  });
  it('scales correction to the full homing span, not just the test width', () => {
    const inputs = synthetic(1, { switchSpan: '1000', width: '500' });
    const first = calculate(inputs);
    const second = calculate({ ...inputs, switchSpan: '2000' });
    if (first.status !== 'valid' || second.status !== 'valid') throw new Error('Expected valid results');
    expect(first.adjustment).toBeCloseTo(1, 8);
    expect(second.adjustment).toBeCloseTo(2, 8);
  });
  it('reverses direction when corner labels A and B are exchanged', () => {
    const inputs = synthetic(3);
    const result = calculate({ ...inputs, diagonalA: inputs.diagonalB, diagonalB: inputs.diagonalA });
    if (result.status !== 'valid') throw new Error('Expected valid result');
    expect(result.adjustment).toBeCloseTo(-3, 8);
  });
  it('uses diagonal difference for tolerance rather than physical switch correction', () => {
    const result = calculate(synthetic(0.2, { switchSpan: '10000', tolerance: '0.1' }));
    if (result.status !== 'valid') throw new Error('Expected valid result');
    expect(result.withinTolerance).toBe(true);
    expect(result.adjustment).toBeCloseTo(0.2, 8);
  });
  it('includes the exact diagonal tolerance boundary', () => {
    const result = calculate({ ...initialInputs, diagonalA: '1803', diagonalB: '1802.5' });
    if (result.status !== 'valid') throw new Error('Expected valid result');
    expect(result.withinTolerance).toBe(true);
  });
  it('flags equal diagonals inconsistent with test dimensions', () => {
    const result = calculate({ ...initialInputs, diagonalA: '1700', diagonalB: '1700' });
    if (result.status !== 'valid') throw new Error('Expected valid result');
    expect(result.geometryWarning).toBe(true);
  });
  it.each(['0', '-2', 'NaN', 'Infinity', 'abc'])('rejects invalid positive dimensions: %s', (width) => {
    expect(calculate({ ...synthetic(1), width }).status).toBe('invalid');
  });
  it('rejects negative tolerance but accepts zero', () => {
    expect(calculate(synthetic(0, { tolerance: '-1' })).status).toBe('invalid');
    expect(calculate(synthetic(0, { tolerance: '0' })).status).toBe('valid');
  });
  it('rejects impossible diagonal geometry', () => {
    expect(calculate({ ...synthetic(1), diagonalA: '3000' }).status).toBe('invalid');
    expect(calculate({ ...synthetic(1), diagonalB: '100' }).status).toBe('invalid');
  });
  it('rejects arithmetic overflow', () => {
    expect(calculate({ width: '1e200', length: '1e200', switchSpan: '1e200',
      diagonalA: '1.4e200', diagonalB: '1.4e200', tolerance: '0' }).status).toBe('invalid');
  });
});
