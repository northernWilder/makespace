import { describe, expect, it } from 'vitest';
import { edgeZero } from './dowel';
import { inputToMm } from './units';

describe('dowel edge zero', () => {
  it('adds paper thickness to radius and signs outside contacts', () => {
    const result = edgeZero(inputToMm('1/4', 'in'), inputToMm('.004', 'in'), 'outside');
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') throw new Error('Expected valid result');
    expect(result.compensation / 25.4).toBeCloseTo(.129, 12);
    expect(result.x).toBe(result.compensation);
    expect(result.y).toBe(-result.compensation);
  });
  it('reverses signs for the inside left/front corner', () => {
    expect(edgeZero('6', '.1', 'inside')).toEqual({ status: 'valid', compensation: 3.1, x: -3.1, y: 3.1 });
  });
  it('allows a zero-thickness feeler', () => {
    expect(edgeZero('6', '0', 'outside')).toEqual({ status: 'valid', compensation: 3, x: 3, y: -3 });
  });
  it.each([['', '.1'], ['0', '.1'], ['-1', '.1'], ['6', '-.1'], ['6', ''], ['NaN', '.1'], ['6', 'Infinity']])('rejects diameter %j / thickness %j', (d, p) => {
    expect(edgeZero(d, p, 'outside').status).toBe('invalid');
  });
});
