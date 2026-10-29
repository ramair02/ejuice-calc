// Specific gravity (g/mL) used to convert volumes to weights.
export const SG = { PG: 1.036, VG: 1.261, Other: 1.0 } as const;
export type Carrier = keyof typeof SG;

export interface CalcInput {
  batchMl: number;
  nicMg: number; // target strength in mg/mL
  pgPct: number; // target PG %; VG is the rest
  nicBase: { strength: number; pgPct: number } | null;
  flavors: { pct: number; carrier: Carrier }[];
}

export interface Amount {
  ml: number;
  g: number;
  pct: number;
}

export interface CalcResult {
  nic: Amount;
  flavors: Amount[];
  pg: Amount;
  vg: Amount;
  total: Amount;
  flavorPct: number;
  problems: string[];
}

const num = (n: number) => (Number.isFinite(n) ? n : 0);

export function calculate(input: CalcInput): CalcResult {
  const batch = Math.max(0, num(input.batchMl));
  const pgFrac = Math.min(100, Math.max(0, num(input.pgPct))) / 100;
  const amount = (ml: number, g: number): Amount => ({ ml, g, pct: batch > 0 ? (ml / batch) * 100 : 0 });
  const problems: string[] = [];

  // Nicotine base
  let nicPG = 0;
  let nicVG = 0;
  const nicMg = Math.max(0, num(input.nicMg));
  if (nicMg > 0) {
    if (!input.nicBase || !(input.nicBase.strength > 0)) {
      problems.push('Pick a nicotine base with a strength above 0.');
    } else {
      if (nicMg > input.nicBase.strength) problems.push('Target strength is higher than the nicotine base strength.');
      const ml = (nicMg * batch) / input.nicBase.strength;
      nicPG = ml * (num(input.nicBase.pgPct) / 100);
      nicVG = ml - nicPG;
    }
  }
  const nic = amount(nicPG + nicVG, nicPG * SG.PG + nicVG * SG.VG);

  // Flavors
  let flavPG = 0;
  let flavVG = 0;
  let flavOther = 0;
  const flavors = input.flavors.map((f) => {
    const ml = (batch * Math.max(0, num(f.pct))) / 100;
    if (f.carrier === 'PG') flavPG += ml;
    else if (f.carrier === 'VG') flavVG += ml;
    else flavOther += ml;
    return amount(ml, ml * SG[f.carrier]);
  });

  // Fill with PG/VG. "Other" carriers (water, alcohol) take room from both, in the target ratio.
  const pgMl = batch * pgFrac - nicPG - flavPG - flavOther * pgFrac;
  const vgMl = batch * (1 - pgFrac) - nicVG - flavVG - flavOther * (1 - pgFrac);
  if (pgMl < -0.005 || vgMl < -0.005) {
    const which = pgMl < -0.005 ? 'PG' : 'VG';
    problems.push(`Not possible: the nicotine base and flavors already contain more ${which} than the target ratio allows.`);
  }
  const pg = amount(pgMl, pgMl * SG.PG);
  const vg = amount(vgMl, vgMl * SG.VG);

  const all = [nic, ...flavors, pg, vg];
  const total = amount(
    all.reduce((s, a) => s + a.ml, 0),
    all.reduce((s, a) => s + a.g, 0),
  );
  const flavorPct = input.flavors.reduce((s, f) => s + Math.max(0, num(f.pct)), 0);

  return { nic, flavors, pg, vg, total, flavorPct, problems };
}
