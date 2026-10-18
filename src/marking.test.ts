import { describe, expect, it } from 'vitest';
import { initialInputs } from './calibration';
import { markingProgram } from './marking';

describe('Mach3 marking pattern', () => {
  it('defaults to a 1000 mm square', () => {
    expect(initialInputs.width).toBe('1000');
    expect(initialInputs.length).toBe('1000');
  });

  it.each([
    ['1000', '1000'],
    ['850.25', '1200.5'],
  ])('marks four corners for %s by %s with safe translation clearance', (width, length) => {
    const result = markingProgram(width, length, '50', '500');
    if (result.status !== 'valid') throw new Error('Expected valid program');
    let absolute = true;
    let x = 123;
    let y = 456;
    let z = 0;
    const marks: number[][] = [];
    const translations: number[][] = [];
    for (const line of result.code.split('\n')) {
      if (line === 'G90') absolute = true;
      if (line === 'G91') absolute = false;
      expect(line).not.toMatch(/G90.*G91|G91.*G90/);
      expect(line).not.toMatch(/^M[34](?:\s|$)|^G0(?:\s|$)/);
      if (!line.startsWith('G1 ')) continue;
      const axis = /([XYZ])(-?(?:\d+(?:\.\d+)?|\.\d+))/.exec(line);
      if (!axis) throw new Error('Expected motion axis');
      const value = Number(axis[2]);
      if (axis[1] === 'Z') {
        expect(absolute).toBe(true);
        z = value;
        if (z < 0) {
          expect(z).toBe(-1);
          expect(line).toContain('F50');
          marks.push([x, y, z]);
        } else {
          expect(z).toBe(10);
          expect(line).toContain('F500');
        }
      } else {
        expect(z).toBe(10);
        expect(absolute).toBe(false);
        expect(line).toContain('F500');
        if (axis[1] === 'X') x += value;
        else y += value;
        translations.push([x, y, z]);
      }
    }
    expect(marks).toEqual([
      [123, 456, -1],
      [123, 456 + Number(width), -1],
      [123 + Number(length), 456 + Number(width), -1],
      [123 + Number(length), 456, -1],
    ]);
    expect(translations).toHaveLength(3);
    expect(z).toBe(10);
    expect(absolute).toBe(true);
    expect(result.code).toContain('M5\nG21\nG90\nG94\nG40\nG80');
    expect(result.code).toMatch(/G1 Z10 F500\n\(END.*\)\nM2$/);
  });

  it.each(['', '0', '-10', 'Infinity', 'NaN', '1e3', '10\nM3', '0.0001'])('rejects unsafe or unsupported numeric input %j', (value) => {
    for (let index = 0; index < 4; index++) {
      const values: [string, string, string, string] = ['1000', '1000', '50', '500'];
      values[index] = value;
      expect(markingProgram(...values).status).toBe('invalid');
    }
  });
});
