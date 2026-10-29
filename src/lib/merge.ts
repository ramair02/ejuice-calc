import type { Item, Mix, Recipe } from './db';

export interface Backup {
  items: Item[];
  recipes: Recipe[];
  mixes: Mix[];
}

export interface MergePlan extends Backup {
  summary: string;
}

const key = (s: string) => s.trim().toLowerCase();
const itemKey = (i: Item) => `${i.kind}:${key(i.name)}`;

// Works out what to write so `incoming` is merged into `existing`:
// - items match by id, then by kind + name; matches are updated in place (keeping our id), others added
// - recipes match by id, then by name; same rule, with flavor/nic ids remapped onto our items
// - mixes are added unless already present
// Nothing that exists only in `existing` is touched.
export function planMerge(existing: Backup, incoming: Backup): MergePlan {
  const itemsById = new Map(existing.items.map((i) => [i.id, i]));
  const itemsByKey = new Map(existing.items.map((i) => [itemKey(i), i]));
  const idMap = new Map<string, string>(); // incoming item id -> our item id
  const items: Item[] = [];
  let itemsAdded = 0;
  for (const inc of incoming.items) {
    const match = itemsById.get(inc.id) ?? itemsByKey.get(itemKey(inc));
    if (!match) itemsAdded++;
    const id = match?.id ?? inc.id;
    idMap.set(inc.id, id);
    items.push({ ...match, ...inc, id });
  }

  const recipesById = new Map(existing.recipes.map((r) => [r.id, r]));
  const recipesByName = new Map(existing.recipes.map((r) => [key(r.name), r]));
  const remap = (id: string) => idMap.get(id) ?? id;
  const recipeIdMap = new Map<string, string>(); // incoming recipe id -> our recipe id
  const recipes: Recipe[] = [];
  let recipesAdded = 0;
  for (const inc of incoming.recipes) {
    const match = recipesById.get(inc.id) ?? recipesByName.get(key(inc.name));
    if (!match) recipesAdded++;
    const id = match?.id ?? inc.id;
    recipeIdMap.set(inc.id, id);
    recipes.push({
      ...match,
      ...inc,
      id,
      nicBaseId: inc.nicBaseId && remap(inc.nicBaseId),
      flavors: inc.flavors.map((f) => ({ ...f, itemId: remap(f.itemId) })),
    });
  }

  const mixIds = new Set(existing.mixes.map((m) => m.id));
  const mixes = incoming.mixes
    .filter((m) => !mixIds.has(m.id))
    .map((m) => ({
      ...m,
      recipeId: m.recipeId && (recipeIdMap.get(m.recipeId) ?? m.recipeId),
      usage: m.usage.map((u) => ({ ...u, itemId: remap(u.itemId) })),
    }));

  const parts = [
    `${itemsAdded} inventory item${itemsAdded === 1 ? '' : 's'} added, ${items.length - itemsAdded} updated`,
    `${recipesAdded} recipe${recipesAdded === 1 ? '' : 's'} added, ${recipes.length - recipesAdded} updated`,
  ];
  if (mixes.length) parts.push(`${mixes.length} history entr${mixes.length === 1 ? 'y' : 'ies'} added`);
  return { items, recipes, mixes, summary: parts.join('; ') + '.' };
}
