import { db } from './db';
import { planMerge, type Backup } from './merge';

export async function exportBackup() {
  const data = {
    app: 'ejuice-calc',
    version: 1,
    exportedAt: new Date().toISOString(),
    items: await db.items.toArray(),
    recipes: await db.recipes.toArray(),
    mixes: await db.mixes.toArray(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ejuice-backup-${data.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function readBackup(file: File): Promise<Backup> {
  const data = JSON.parse(await file.text());
  if (data?.app !== 'ejuice-calc' || !Array.isArray(data.items) || !Array.isArray(data.recipes)) {
    throw new Error('That file is not an e-juice calculator backup.');
  }
  return { items: data.items, recipes: data.recipes, mixes: Array.isArray(data.mixes) ? data.mixes : [] };
}

// Replaces everything with the backup's contents.
export async function replaceAll(data: Backup) {
  await db.transaction('rw', db.items, db.recipes, db.mixes, async () => {
    await Promise.all([db.items.clear(), db.recipes.clear(), db.mixes.clear()]);
    await db.items.bulkAdd(data.items);
    await db.recipes.bulkAdd(data.recipes);
    await db.mixes.bulkAdd(data.mixes);
  });
}

// Adds new items/recipes/history and updates matching ones; keeps everything else. Returns a summary.
export async function mergeIn(data: Backup): Promise<string> {
  return db.transaction('rw', db.items, db.recipes, db.mixes, async () => {
    const existing = { items: await db.items.toArray(), recipes: await db.recipes.toArray(), mixes: await db.mixes.toArray() };
    const plan = planMerge(existing, data);
    await db.items.bulkPut(plan.items);
    await db.recipes.bulkPut(plan.recipes);
    await db.mixes.bulkPut(plan.mixes);
    return plan.summary;
  });
}
