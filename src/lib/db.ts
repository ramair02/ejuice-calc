import Dexie, { type EntityTable } from 'dexie';
import type { Carrier } from './calc';
import { seed } from './seed';

export type ItemKind = 'flavor' | 'nic' | 'pg' | 'vg';

export interface Item {
  id: string;
  kind: ItemKind;
  name: string;
  ml: number; // on hand
  lowMl: number; // warn at or below this
  carrier?: Carrier; // flavors
  strength?: number; // nic base, mg/mL
  pgPct?: number; // nic base PG %
}

export interface Recipe {
  id: string;
  name: string;
  notes: string;
  batchMl: number;
  nicMg: number;
  pgPct: number;
  nicBaseId: string | null;
  flavors: { itemId: string; pct: number }[];
  updatedAt: number;
}

export interface MixUsage {
  itemId: string;
  name: string;
  ml: number; // what the batch called for
  deducted: number; // what was actually taken off inventory (capped at what was on hand)
}

export interface Mix {
  id: string;
  date: number;
  recipeId: string | null;
  recipeName: string;
  batchMl: number;
  nicMg: number;
  pgPct: number;
  usage: MixUsage[];
}

class EJuiceDB extends Dexie {
  items!: EntityTable<Item, 'id'>;
  recipes!: EntityTable<Recipe, 'id'>;
  mixes!: EntityTable<Mix, 'id'>;

  constructor() {
    super('ejuice');
    this.version(1).stores({ items: 'id, kind, name', recipes: 'id, name', mixes: 'id, date, recipeId' });
    this.on('populate', (tx) => seed(tx));
  }
}

export const db = new EJuiceDB();

// crypto.randomUUID is unavailable over plain http on a LAN address, so roll our own.
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const round2 = (n: number) => Math.round(n * 100) / 100;
