# Development

## Setup

```bash
npm install
npm run dev     # http://localhost:5173, reloads automatically on save
npm test        # Vitest, run once
npm run build   # tsc type-check + Vite build into dist/
```

Requires Node.js 22+. Built with React 19, TypeScript, Vite, Dexie 4 (IndexedDB) and Vitest.

## Project structure

```
index.html                 App entry page
Start E-Juice.cmd          Windows launcher (start server + open browser)
vite.config.ts             base: './' so dist/ works from any path
src/
  main.tsx                 Mounts React, requests persistent storage
  App.tsx                  Tabs, Export/Import, import dialog
  styles.css               All styling; light/dark via CSS variables
  components/
    Calculator.tsx         Recipe editor, results table, Mix dialog
    Recipes.tsx            Recipe cards with "can make" status
    Inventory.tsx          Inventory tables, restock, status
    History.tsx            Mix log with undo
    NumberInput.tsx        Number field that doesn't fight partial input like "1."
  lib/
    calc.ts                Pure mixing math (no DB)            ← tested
    recipe.ts              Draft model, evaluate(), maxBatch(), save/mix/undo
    db.ts                  Dexie schema and types (Item, Recipe, Mix)
    seed.ts                First-run starting data
    backup.ts              Export, read file, replace all, merge
    merge.ts               Pure merge planning                 ← tested
docs/                      These guides
```

## Data model

Three IndexedDB tables in the database `ejuice` (see `src/lib/db.ts`):

- **items**: inventory. `kind` is `flavor`, `nic`, `pg` or `vg`. One table means the same code handles stock for every ingredient.
- **recipes**: flavors reference items by `itemId`, so renaming an item doesn't break recipes.
- **mixes**: history, with `usage[]` recording both the needed mL and the deducted mL.

The Calculator edits a **Draft** (`src/lib/recipe.ts`) where flavors are **names**, so you can type a brand-new flavor. Names are resolved to items when you save or mix, and unknown names become new 0 mL items.

UI components read the database through `useLiveQuery`, so any write, including one from another tab, re-renders automatically.

**Schema changes:** bump `this.version(n)` in `db.ts` and add an upgrade if needed. Existing users' data must keep working. Seed data only runs on brand-new databases (Dexie's `populate` event).

## Tests

- `calc.test.ts` checks the math against screenshots of the original calculator, plus edge cases: VG-carried ingredients, "Other" carriers, impossible ratios, missing or too-weak bases.
- `merge.test.ts` covers merging: matching by ID and by name, keeping the app's IDs, remapping recipe flavor IDs, and skipping duplicate history entries.

If you change the formulas, keep the "matches the old HTML calculator" test passing, or update it deliberately.

## Hosting somewhere else (e.g. Unraid)

`npm run build` produces a fully static site in `dist/`. It needs no server-side code, so any static web server works, for example an nginx container serving `dist/`.

Things to know first:

- **Data doesn't move with it.** Each address (e.g. `http://tower:8080`) has its own empty database in each browser. Export from localhost and Import into the new address.
- **Each device has its own data.** Opening it from your phone gives the phone its own separate copy. There's no syncing between devices. Sharing data would need a backend, which this app doesn't have.
- IDs are generated without `crypto.randomUUID`, so the app also works over plain `http://` on a LAN address.

## Origin

This app replaces `ejuice calc.html`, a single-file calculator that saved recipes to `localStorage`. The math and specific-gravity constants are the same. Recipes saved in the old page aren't imported automatically, because they live in that file's own browser storage.
