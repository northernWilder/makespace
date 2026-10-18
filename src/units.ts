import type { CalibrationInputs } from './calibration';

export type Unit = 'mm' | 'in';

export function fromMm(value: number, unit: Unit): number {
  return unit === 'in' ? value / 25.4 : value;
}

export function inputToMm(value: string, unit: Unit): string {
  if (value.trim() === '' || unit === 'mm') return value;
  return String(Number((parseInches(value) * 25.4).toPrecision(15)));
}

export function parseInches(value: string): number {
  const text = value.trim();
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return Number(text);
  const fraction = /^([+-]?)(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/.exec(text);
  if (!fraction) return NaN;
  const denominator = Number(fraction[4]);
  if (!denominator) return NaN;
  const magnitude = Number(fraction[2] ?? 0) + Number(fraction[3]) / denominator;
  return fraction[1] === '-' ? -magnitude : magnitude;
}
export function inputsForDisplay(inputs: CalibrationInputs, unit: Unit): CalibrationInputs {
  const convert = (value: string) => value.trim() === '' || unit === 'mm'
    ? value
    : String(Number(fromMm(Number(value), unit).toFixed(10)));
  return {
    width: convert(inputs.width),
    length: convert(inputs.length),
    switchSpan: convert(inputs.switchSpan),
    diagonalA: convert(inputs.diagonalA),
    diagonalB: convert(inputs.diagonalB),
    tolerance: convert(inputs.tolerance),
  };
}

export function formatDistance(mm: number, unit: Unit): string {
  return fromMm(mm, unit).toLocaleString(undefined, {
    minimumFractionDigits: unit === 'in' ? 4 : 2,
    maximumFractionDigits: unit === 'in' ? 4 : 2,
  });
}
