export type Corner = 'outside' | 'inside';
export type EdgeZeroResult =
  | { status: 'invalid'; message: string }
  | { status: 'valid'; compensation: number; x: number; y: number };

export function edgeZero(diameter: string, paper: string, corner: Corner): EdgeZeroResult {
  const d = Number(diameter);
  const p = Number(paper);
  if (!diameter.trim() || !paper.trim() || !Number.isFinite(d) || !Number.isFinite(p) || d <= 0 || p < 0) {
    return { status: 'invalid', message: 'Enter a positive dowel diameter and a non-negative paper thickness. Use valid decimals or inch fractions.' };
  }
  const compensation = d / 2 + p;
  if (!Number.isFinite(compensation)) return { status: 'invalid', message: 'The compensation is too large. Check your measurements.' };
  return { status: 'valid', compensation,
    x: corner === 'outside' ? compensation : -compensation,
    y: corner === 'outside' ? -compensation : compensation };
}
