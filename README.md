# E-Juice Calculator

A DIY e-liquid calculator with recipe storage and inventory tracking. It runs entirely in your browser: no account, no server, no cloud. All data stays on your machine.

It rebuilds an older single-file HTML calculator in React + TypeScript and adds:

- **Inventory**: how many mL of each flavor, nicotine base, PG and VG you have on hand.
- **"What can I make?"**: each recipe shows the largest batch your current stock allows, or which ingredients you're missing.
- **Mix log**: "Mix this batch…" deducts the ingredients from inventory and records the batch in History. You can undo it.
- **Backups and bulk import**: export everything to JSON, or merge in recipes and inventory from a JSON file (for example, one written in Claude chat).

## Quick start

You need [Node.js](https://nodejs.org/) 22 or newer.

```bash
git clone https://github.com/ramair02/ejuice-calc.git
cd ejuice-calc
npm install
npm run dev
```

Open **http://localhost:5173**.

On Windows, you can double-click **`Start E-Juice.cmd`** instead. It installs dependencies the first time, starts the app, and opens your browser. If the app is already running, it just opens the page. Keep its window open while you use the app, and close it to stop the app. See [Desktop shortcut](docs/user-guide.md#desktop-shortcut) for putting it on your desktop.

> ⚠️ **Your data is tied to the address `http://localhost:5173` in the browser you use.** A different browser, a different port, or `127.0.0.1` instead of `localhost` will each show an empty app. See [Where your data lives](docs/user-guide.md#where-your-data-lives).

## Documentation

| Guide | What's in it |
|---|---|
| [User guide](docs/user-guide.md) | Every tab and button, adding recipes, tracking inventory, mixing, backups, troubleshooting |
| [Import file format](docs/data-format.md) | The JSON format for backups and bulk imports, how merging works, and a prompt for getting Claude to write import files |
| [How the math works](docs/calculations.md) | The formulas behind mL, grams, %, PG/VG fill and "max batch" |
| [Development](docs/development.md) | Project structure, tests, building, and hosting it elsewhere (e.g. Unraid) |

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Starts the app at http://localhost:5173 |
| `npm test` | Runs the calculator and import-merge tests |
| `npm run build` | Type-checks and builds a static site into `dist/` |
| `npm run preview` | Serves the built `dist/` locally (on port 4173, which has **separate data** from 5173) |

## Tech

React 19, TypeScript, Vite, [Dexie](https://dexie.org/) (IndexedDB), Vitest. No backend.
