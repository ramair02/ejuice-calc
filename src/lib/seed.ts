import type { Transaction } from 'dexie';
import type { Item, Recipe } from './db';

// Starting data: the flavor stash and recipes from ejuice-recipes.md, plus the three
// recipes from the old calculator screenshots. Quantities start at 0 — fill them in on
// the Inventory tab.

const FLAVORS = [
  'TFA Bavarian Cream',
  'FA Fresh Cream',
  'TFA Sour',
  'CAP Sweet Lychee',
  'TFA Honeysuckle',
  'CAP Sweet Mango',
  'TFA Cantaloupe',
  'TFA Nectarine',
  'TFA Pear',
  'TFA Juicy Peach',
  'TFA Honeydew',
  'Fruity Flakes', // used in Mango Fruity Flakes; not in the on-hand list
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const FRUIT_STEEP = 'Straight fruit: good after a day or two.';
const CREAM_STEEP = 'Has Bavarian Cream: improves a lot with 1–2 weeks of steeping.';

type SeedRecipe = [name: string, flavors: [string, number][], notes?: string, batchMl?: number, nicMg?: number];

const RECIPES: SeedRecipe[] = [
  ['Lychee Blossom', [['CAP Sweet Lychee', 5], ['TFA Pear', 3.5], ['TFA Honeysuckle', 1], ['TFA Sour', 0.5]], `Floral, juicy. ${FRUIT_STEEP}`, 400],
  ['Peaches & Cream', [['TFA Juicy Peach', 4], ['TFA Nectarine', 2], ['TFA Bavarian Cream', 2.5], ['FA Fresh Cream', 1.5]], CREAM_STEEP],
  ['Double Melon', [['TFA Honeydew', 4], ['TFA Cantaloupe', 4], ['CAP Sweet Lychee', 1.5], ['TFA Sour', 0.5]], FRUIT_STEEP],
  ['Mango Lassi', [['CAP Sweet Mango', 5], ['TFA Bavarian Cream', 3], ['FA Fresh Cream', 1.5], ['TFA Sour', 0.5]], `Sour adds a yogurt-like tang. ${CREAM_STEEP}`],
  ['Sour Mango Peach', [['CAP Sweet Mango', 4], ['TFA Juicy Peach', 4], ['TFA Nectarine', 1], ['TFA Sour', 1]], FRUIT_STEEP],
  ['Garden Pear', [['TFA Pear', 5], ['TFA Honeydew', 3], ['TFA Honeysuckle', 1], ['FA Fresh Cream', 1]]],
  ['Stone Fruit Orchard', [['TFA Juicy Peach', 4], ['TFA Nectarine', 4], ['CAP Sweet Lychee', 1], ['TFA Honeysuckle', 0.5], ['TFA Sour', 0.5]], FRUIT_STEEP],
  ['Melon Cream', [['TFA Cantaloupe', 4], ['TFA Honeydew', 2], ['TFA Bavarian Cream', 2.5], ['FA Fresh Cream', 1.5]], CREAM_STEEP],
  ['Tropical Haze', [['CAP Sweet Mango', 4], ['CAP Sweet Lychee', 3], ['TFA Juicy Peach', 2.5], ['TFA Sour', 0.5]], FRUIT_STEEP],
  ['Lychee Pear', [['CAP Sweet Lychee', 5], ['TFA Pear', 4.5], ['TFA Sour', 0.5]], FRUIT_STEEP],
  ['Honeydew Peach Cooler', [['TFA Honeydew', 4], ['TFA Juicy Peach', 3], ['TFA Cantaloupe', 2], ['FA Fresh Cream', 1]], '', 400],
  ['Mango Fruity Flakes', [['Fruity Flakes', 4], ['CAP Sweet Mango', 3], ['FA Fresh Cream', 1]], '', 300],
  ['Melon Fruit Punch', [['TFA Cantaloupe', 3], ['TFA Honeydew', 3], ['TFA Juicy Peach', 2], ['TFA Pear', 2]], '', 110, 2],
];

export async function seed(tx: Transaction) {
  const items: Item[] = [
    { id: 'nic-100', kind: 'nic', name: 'Nicotine base 100 mg', strength: 100, pgPct: 100, ml: 0, lowMl: 10 },
    { id: 'pg', kind: 'pg', name: 'PG', ml: 0, lowMl: 50 },
    { id: 'vg', kind: 'vg', name: 'VG', ml: 0, lowMl: 50 },
    ...FLAVORS.map((name): Item => ({ id: slug(name), kind: 'flavor', name, carrier: 'PG', ml: 0, lowMl: 5 })),
  ];
  const now = Date.now();
  const recipes: Recipe[] = RECIPES.map(([name, flavors, notes = '', batchMl = 100, nicMg = 1.5], i) => ({
    id: slug(name),
    name,
    notes,
    batchMl,
    nicMg,
    pgPct: 50,
    nicBaseId: 'nic-100',
    flavors: flavors.map(([flavor, pct]) => ({ itemId: slug(flavor), pct })),
    updatedAt: now + i,
  }));
  await tx.table('items').bulkAdd(items);
  await tx.table('recipes').bulkAdd(recipes);
}
