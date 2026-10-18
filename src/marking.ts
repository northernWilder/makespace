export type MarkingResult = { status: 'valid'; code: string } | { status: 'invalid'; message: string };

export function markingProgram(width: string, length: string, plungeFeed: string, travelFeed: string): MarkingResult {
  const values = [width, length, plungeFeed, travelFeed].map((value) => value.trim());
  if (values.some((value) => !/^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(value) ||
    !Number.isFinite(Number(value)) || Number(value) <= 0)) {
    return { status: 'invalid', message: 'Enter positive width, length, and feed rates using plain decimal numbers with at most 3 decimal places.' };
  }
  const [w, l, plunge, travel] = values;
  return { status: 'valid', code: [
    '(NON-ROTATING MARKER - SACRIFICIAL SURFACE ONLY)',
    '(START XY AT POINT 1 - CURRENT WORK Z ZERO IS SURFACE)',
    'M5',
    'G21',
    'G90',
    'G94',
    'G40',
    'G80',
    '(RETRACT BEFORE FIRST MARK)',
    `G1 Z10 F${travel}`,
    '(POINT 1 - REAR LEFT - CURRENT XY)',
    `G1 Z-1 F${plunge}`,
    `G1 Z10 F${travel}`,
    '(POINT 2 - RIGHT BY WIDTH)',
    'G91',
    `G1 Y${w} F${travel}`,
    'G90',
    `G1 Z-1 F${plunge}`,
    `G1 Z10 F${travel}`,
    '(POINT 3 - FRONT BY LENGTH)',
    'G91',
    `G1 X${l} F${travel}`,
    'G90',
    `G1 Z-1 F${plunge}`,
    `G1 Z10 F${travel}`,
    '(POINT 4 - LEFT BY WIDTH)',
    'G91',
    `G1 Y-${w} F${travel}`,
    'G90',
    `G1 Z-1 F${plunge}`,
    `G1 Z10 F${travel}`,
    '(END AT POINT 4 - Z10 - ABSOLUTE MODE)',
    'M2',
  ].join('\n') };
}
