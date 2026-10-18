export type CalibrationInputs = {
  width: string;
  length: string;
  switchSpan: string;
  diagonalA: string;
  diagonalB: string;
  tolerance: string;
};

export const initialInputs: CalibrationInputs = {
  width: '1000',
  length: '1000',
  switchSpan: '1250',
  diagonalA: '',
  diagonalB: '',
  tolerance: '0.5',
};

export type CalibrationResult =
  | { status: 'incomplete' }
  | { status: 'invalid'; message: string }
  | {
      status: 'valid';
      adjustment: number;
      difference: number;
      angle: number;
      withinTolerance: boolean;
      geometryWarning: boolean;
      expectedDiagonal: number;
    };

export function calculate(inputs: CalibrationInputs): CalibrationResult {
  const entries = Object.values(inputs);
  if (entries.some((value) => value.trim() === '')) return { status: 'incomplete' };
  const { width, length, switchSpan, diagonalA, diagonalB, tolerance } =
    Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, Number(value)]));
  if (entries.some((value) => !Number.isFinite(Number(value))) ||
      [width, length, switchSpan, diagonalA, diagonalB].some((value) => value <= 0) ||
      tolerance < 0) {
    return { status: 'invalid', message: 'Enter valid, positive distances. In inches, use decimals, fractions like 3/8, or mixed numbers like 42 3/8; fraction denominators must not be zero. The diagonal tolerance may be zero.' };
  }
  const sinAngle = ((diagonalA - diagonalB) * (diagonalA + diagonalB)) / (4 * width * length);
  if (!Number.isFinite(sinAngle) || Math.abs(sinAngle) >= 1 ||
      [diagonalA, diagonalB].some((d) => d <= Math.abs(width - length) || d >= width + length)) {
    return { status: 'invalid', message: 'These measurements cannot form the test parallelogram. Check corner labels, dimensions, and units.' };
  }
  const expectedDiagonal = Math.hypot(width, length);
  const measuredMeanSquare = (diagonalA ** 2 + diagonalB ** 2) / 2;
  const expectedMeanSquare = width ** 2 + length ** 2;
  const adjustment = switchSpan * sinAngle;
  if (![measuredMeanSquare, expectedMeanSquare, adjustment, expectedDiagonal].every(Number.isFinite)) {
    return { status: 'invalid', message: 'Distances are too large to calculate reliably. Check your units.' };
  }
  return {
    status: 'valid',
    adjustment,
    difference: diagonalA - diagonalB,
    angle: Math.asin(sinAngle) * 180 / Math.PI,
    withinTolerance: Math.abs(diagonalA - diagonalB) <= tolerance,
    geometryWarning: Math.abs(Math.sqrt(measuredMeanSquare) - expectedDiagonal) > Math.max(1, tolerance),
    expectedDiagonal,
  };
}

export function formatMm(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function correctionDirection(adjustment: number): string {
  if (adjustment === 0) return 'no movement';
  return adjustment > 0
    ? 'forward, away from the back of the machine (+X)'
    : 'backward, toward the back of the machine (−X)';
}
