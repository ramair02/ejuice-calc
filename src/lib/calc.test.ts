import { describe, expect, it } from 'vitest';
import { calculate } from './calc';

const base100 = { strength: 100, pgPct: 100 };

describe('calculate', () => {
  it('matches the old HTML calculator: Lychee Blossom, 400 mL, 1.5 mg, 50/50', () => {
    const r = calculate({
      batchMl: 400,
      nicMg: 1.5,
      pgPct: 50,
      nicBase: base100,
      flavors: [5, 3.5, 1, 0.5].map((pct) => ({ pct, carrier: 'PG' as const })),
    });
    expect(r.nic.ml).toBeCloseTo(6, 2);
    expect(r.nic.g).toBeCloseTo(6.22, 2);
    expect(r.nic.pct).toBeCloseTo(1.5, 2);
    expect(r.flavors.map((f) => f.ml)).toEqual([20, 14, 4, 2]);
    expect(r.flavors[0].g).toBeCloseTo(20.72, 2);
    expect(r.vg.ml).toBeCloseTo(200, 2);
    expect(r.vg.g).toBeCloseTo(252.2, 2);
    expect(r.pg.ml).toBeCloseTo(154, 2);
    expect(r.pg.g).toBeCloseTo(159.54, 2);
    expect(r.total.ml).toBeCloseTo(400, 2);
    expect(r.total.g).toBeCloseTo(459.4, 1);
    expect(r.flavorPct).toBe(10);
    expect(r.problems).toEqual([]);
  });

  it('matches Melon Fruit Punch: 110 mL, 2 mg, 50/50', () => {
    const r = calculate({
      batchMl: 110,
      nicMg: 2,
      pgPct: 50,
      nicBase: base100,
      flavors: [3, 3, 2, 2].map((pct) => ({ pct, carrier: 'PG' as const })),
    });
    expect(r.nic.ml).toBeCloseTo(2.2, 2);
    expect(r.pg.ml).toBeCloseTo(41.8, 2);
    expect(r.vg.ml).toBeCloseTo(55, 2);
  });

  it('subtracts VG-carried nicotine and flavor from the VG fill', () => {
    const r = calculate({
      batchMl: 100,
      nicMg: 10,
      pgPct: 30,
      nicBase: { strength: 100, pgPct: 50 },
      flavors: [{ pct: 5, carrier: 'VG' }],
    });
    // nic 10 mL = 5 PG + 5 VG; flavor 5 VG
    expect(r.pg.ml).toBeCloseTo(25, 5);
    expect(r.vg.ml).toBeCloseTo(60, 5);
    expect(r.total.ml).toBeCloseTo(100, 5);
  });

  it('keeps the total at the batch size for "Other" carriers', () => {
    const r = calculate({ batchMl: 100, nicMg: 0, pgPct: 50, nicBase: null, flavors: [{ pct: 10, carrier: 'Other' }] });
    expect(r.pg.ml).toBeCloseTo(45, 5);
    expect(r.vg.ml).toBeCloseTo(45, 5);
    expect(r.total.ml).toBeCloseTo(100, 5);
  });

  it('flags impossible PG targets', () => {
    const r = calculate({
      batchMl: 100,
      nicMg: 3,
      pgPct: 5,
      nicBase: base100,
      flavors: [{ pct: 10, carrier: 'PG' }],
    });
    expect(r.pg.ml).toBeLessThan(0);
    expect(r.problems).toHaveLength(1);
  });

  it('flags a missing or too-weak nicotine base', () => {
    expect(calculate({ batchMl: 30, nicMg: 3, pgPct: 50, nicBase: null, flavors: [] }).problems).toHaveLength(1);
    expect(calculate({ batchMl: 30, nicMg: 50, pgPct: 50, nicBase: { strength: 20, pgPct: 100 }, flavors: [] }).problems.length).toBeGreaterThan(0);
  });
});
