import { calculate, type Amount, type CalcResult } from './calc';
import { db, round2, uid, type Item, type ItemKind, type Recipe } from './db';

// What the calculator edits. Flavors are by name so you can type a new one; names are
// resolved to inventory items on save/mix (unknown names become new 0 mL items).
export interface Draft {
  id: string | null;
  name: string;
  notes: string;
  batchMl: number;
  nicMg: number;
  pgPct: number;
  nicBaseId: string | null;
  flavors: { name: string; pct: number }[];
}

export interface Line {
  kind: ItemKind;
  label: string;
  item?: Item;
  amount: Amount;
}

export interface Evaluation {
  result: CalcResult;
  lines: Line[];
  need: Map<string, { item: Item; ml: number }>; // total needed per inventory item
  isShort: (line: Line) => boolean;
}

export const findFlavor = (items: Item[], name: string) => {
  const key = name.trim().toLowerCase();
  return items.find((i) => i.kind === 'flavor' && i.name.toLowerCase() === key);
};

export function newDraft(items: Item[]): Draft {
  return {
    id: null,
    name: '',
    notes: '',
    batchMl: 100,
    nicMg: 1.5,
    pgPct: 50,
    nicBaseId: items.find((i) => i.kind === 'nic')?.id ?? null,
    flavors: [{ name: '', pct: 0 }],
  };
}

export function recipeToDraft(r: Recipe, items: Item[]): Draft {
  const byId = new Map(items.map((i) => [i.id, i]));
  return {
    id: r.id,
    name: r.name,
    notes: r.notes,
    batchMl: r.batchMl,
    nicMg: r.nicMg,
    pgPct: r.pgPct,
    nicBaseId: r.nicBaseId,
    flavors: r.flavors.map((f) => ({ name: byId.get(f.itemId)?.name ?? '(deleted flavor)', pct: f.pct })),
  };
}

export function evaluate(d: Draft, items: Item[]): Evaluation {
  const nicItem = items.find((i) => i.id === d.nicBaseId && i.kind === 'nic');
  const rows = d.flavors.filter((f) => f.name.trim());
  const flavorItems = rows.map((f) => findFlavor(items, f.name));
  const result = calculate({
    batchMl: d.batchMl,
    nicMg: d.nicMg,
    pgPct: d.pgPct,
    nicBase: nicItem ? { strength: nicItem.strength ?? 0, pgPct: nicItem.pgPct ?? 100 } : null,
    flavors: rows.map((f, i) => ({ pct: f.pct, carrier: flavorItems[i]?.carrier ?? 'PG' })),
  });

  const lines: Line[] = [];
  if (result.nic.ml > 0) {
    lines.push({ kind: 'nic', label: nicItem?.name ?? 'Nicotine base', item: nicItem, amount: result.nic });
  }
  rows.forEach((f, i) => lines.push({ kind: 'flavor', label: f.name.trim(), item: flavorItems[i], amount: result.flavors[i] }));
  lines.push({ kind: 'vg', label: 'VG', item: items.find((i) => i.kind === 'vg'), amount: result.vg });
  lines.push({ kind: 'pg', label: 'PG', item: items.find((i) => i.kind === 'pg'), amount: result.pg });

  const need = new Map<string, { item: Item; ml: number }>();
  for (const l of lines) {
    if (!l.item || l.amount.ml <= 0) continue;
    const prev = need.get(l.item.id);
    need.set(l.item.id, { item: l.item, ml: (prev?.ml ?? 0) + l.amount.ml });
  }
  const isShort = (l: Line) =>
    l.amount.ml > 0.005 && (!l.item || need.get(l.item.id)!.ml > l.item.ml + 0.005);

  return { result, lines, need, isShort };
}

// Largest batch current stock allows, and what's stopping you if it's zero.
export function maxBatch(d: Draft, ev: Evaluation): { ml: number; blockers: string[] } {
  if (ev.result.problems.length || !(d.batchMl > 0)) return { ml: 0, blockers: [] };
  const blockers = ev.lines.filter((l) => l.amount.ml > 0.005 && !l.item).map((l) => l.label);
  let ml = blockers.length ? 0 : Infinity;
  for (const { item, ml: needed } of ev.need.values()) {
    if (item.ml <= 0) blockers.push(item.name);
    ml = Math.min(ml, (Math.max(0, item.ml) * d.batchMl) / needed);
  }
  return { ml: Number.isFinite(ml) ? ml : 0, blockers };
}

async function ensureFlavors(names: string[]) {
  const items = await db.items.toArray();
  for (const name of names.map((n) => n.trim()).filter(Boolean)) {
    if (findFlavor(items, name)) continue;
    const item: Item = { id: uid(), kind: 'flavor', name, carrier: 'PG', ml: 0, lowMl: 5 };
    await db.items.add(item);
    items.push(item);
  }
  return items;
}

export async function saveRecipe(d: Draft): Promise<string> {
  return db.transaction('rw', db.items, db.recipes, async () => {
    const items = await ensureFlavors(d.flavors.map((f) => f.name));
    const recipe: Recipe = {
      id: d.id ?? uid(),
      name: d.name.trim(),
      notes: d.notes,
      batchMl: d.batchMl,
      nicMg: d.nicMg,
      pgPct: d.pgPct,
      nicBaseId: d.nicBaseId,
      flavors: d.flavors
        .filter((f) => f.name.trim())
        .map((f) => ({ itemId: findFlavor(items, f.name)!.id, pct: f.pct })),
      updatedAt: Date.now(),
    };
    await db.recipes.put(recipe);
    return recipe.id;
  });
}

// Deducts the batch from inventory and logs it. Stock never goes below 0; the log records
// what was actually deducted so Undo puts back exactly that.
export async function mixBatch(d: Draft) {
  await db.transaction('rw', db.items, db.mixes, async () => {
    const items = await ensureFlavors(d.flavors.map((f) => f.name));
    const { lines } = evaluate(d, items);
    const usage = [];
    for (const l of lines) {
      if (!l.item || l.amount.ml <= 0) continue;
      const item = (await db.items.get(l.item.id))!;
      const deducted = round2(Math.min(Math.max(0, item.ml), l.amount.ml));
      await db.items.update(item.id, { ml: round2(item.ml - deducted) });
      usage.push({ itemId: item.id, name: l.label, ml: round2(l.amount.ml), deducted });
    }
    await db.mixes.add({
      id: uid(),
      date: Date.now(),
      recipeId: d.id,
      recipeName: d.name.trim() || 'Untitled mix',
      batchMl: d.batchMl,
      nicMg: d.nicMg,
      pgPct: d.pgPct,
      usage,
    });
  });
}

export async function undoMix(mixId: string) {
  await db.transaction('rw', db.items, db.mixes, async () => {
    const mix = await db.mixes.get(mixId);
    if (!mix) return;
    for (const u of mix.usage) {
      const item = await db.items.get(u.itemId);
      if (item) await db.items.update(item.id, { ml: round2(item.ml + u.deducted) });
    }
    await db.mixes.delete(mixId);
  });
}
