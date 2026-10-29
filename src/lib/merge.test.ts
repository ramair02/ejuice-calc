import { describe, expect, it } from 'vitest';
import type { Item, Mix, Recipe } from './db';
import { planMerge } from './merge';

const flavor = (id: string, name: string, ml = 0): Item => ({ id, kind: 'flavor', name, carrier: 'PG', ml, lowMl: 5 });
const recipe = (id: string, name: string, itemIds: string[]): Recipe => ({
  id,
  name,
  notes: '',
  batchMl: 100,
  nicMg: 1.5,
  pgPct: 50,
  nicBaseId: 'nic-100',
  flavors: itemIds.map((itemId) => ({ itemId, pct: 5 })),
  updatedAt: 0,
});

describe('planMerge', () => {
  const existing = {
    items: [flavor('tfa-pear', 'TFA Pear', 10), flavor('abc123', 'TFA Sour', 2)],
    recipes: [recipe('lychee-blossom', 'Lychee Blossom', ['tfa-pear']), recipe('old1', 'Garden Pear', ['tfa-pear'])],
    mixes: [] as Mix[],
  };

  it('updates matching items by id, matches by name otherwise, and adds new ones', () => {
    const plan = planMerge(existing, {
      items: [flavor('tfa-pear', 'TFA Pear', 77), flavor('tfa-sour', 'tfa sour', 55), flavor('tfa-kiwi', 'TFA Kiwi', 30)],
      recipes: [],
      mixes: [],
    });
    expect(plan.items).toEqual([
      flavor('tfa-pear', 'TFA Pear', 77),
      flavor('abc123', 'tfa sour', 55), // keeps our id
      flavor('tfa-kiwi', 'TFA Kiwi', 30),
    ]);
    expect(plan.summary).toContain('1 inventory item added, 2 updated');
  });

  it('adds new recipes, updates same-named ones, and remaps flavor ids onto our items', () => {
    const plan = planMerge(existing, {
      items: [flavor('tfa-sour', 'TFA Sour', 55)],
      recipes: [recipe('new-garden', 'garden pear', ['tfa-sour']), recipe('peach-rings', 'Peach Rings', ['tfa-sour', 'tfa-pear'])],
      mixes: [],
    });
    expect(plan.recipes.map((r) => [r.id, r.name, r.flavors.map((f) => f.itemId)])).toEqual([
      ['old1', 'garden pear', ['abc123']],
      ['peach-rings', 'Peach Rings', ['abc123', 'tfa-pear']],
    ]);
    expect(plan.summary).toContain('1 recipe added, 1 updated');
  });

  it('skips history entries that already exist', () => {
    const mix: Mix = { id: 'm1', date: 0, recipeId: null, recipeName: 'x', batchMl: 10, nicMg: 0, pgPct: 50, usage: [] };
    const plan = planMerge({ ...existing, mixes: [mix] }, { items: [], recipes: [], mixes: [mix, { ...mix, id: 'm2' }] });
    expect(plan.mixes.map((m) => m.id)).toEqual(['m2']);
  });
});
