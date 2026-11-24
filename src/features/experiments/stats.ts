import type { VariantStats } from './api';

/** En dessous, l'écart de conversion n'est pas interprétable. */
export const MIN_DRIVERS_PER_VARIANT = 30;

/** Fonction de répartition de la loi normale centrée réduite (Abramowitz-Stegun 7.1.26). */
function normalCdf(z: number) {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const poly =
    t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/**
 * Test de deux proportions (bilatéral) sur la conversion en 1re recharge.
 * Renvoie null si le test n'a pas de sens (un groupe vide ou aucune variance).
 */
export function conversionPValue(a: Pick<VariantStats, 'drivers' | 'converted'>, b: Pick<VariantStats, 'drivers' | 'converted'>) {
  if (!a.drivers || !b.drivers) return null;
  const pooled = (a.converted + b.converted) / (a.drivers + b.drivers);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / a.drivers + 1 / b.drivers));
  if (!se) return null;
  const z = (a.converted / a.drivers - b.converted / b.drivers) / se;
  return 2 * (1 - normalCdf(Math.abs(z)));
}

export type Verdict =
  | { kind: 'insufficient'; missingA: number; missingB: number }
  | { kind: 'no-difference'; pValue: number | null; diffPoints: number }
  | { kind: 'winner'; winner: 'A' | 'B'; pValue: number; diffPoints: number };

/** Lecture de la conversion uniquement : le coût se lit à côté. */
export function conversionVerdict(a: VariantStats, b: VariantStats, alpha = 0.05): Verdict {
  if (a.drivers < MIN_DRIVERS_PER_VARIANT || b.drivers < MIN_DRIVERS_PER_VARIANT) {
    return {
      kind: 'insufficient',
      missingA: Math.max(0, MIN_DRIVERS_PER_VARIANT - a.drivers),
      missingB: Math.max(0, MIN_DRIVERS_PER_VARIANT - b.drivers),
    };
  }
  const diffPoints = (a.conversionRate - b.conversionRate) * 100;
  const pValue = conversionPValue(a, b);
  if (pValue === null || pValue >= alpha) return { kind: 'no-difference', pValue, diffPoints };
  return { kind: 'winner', winner: diffPoints > 0 ? 'A' : 'B', pValue, diffPoints };
}
