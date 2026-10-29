import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Calculator } from './components/Calculator';
import { History } from './components/History';
import { Inventory, stockStatus } from './components/Inventory';
import { Recipes } from './components/Recipes';
import { exportBackup, mergeIn, readBackup, replaceAll } from './lib/backup';
import { db } from './lib/db';
import type { Backup } from './lib/merge';
import { newDraft, recipeToDraft, type Draft } from './lib/recipe';

type Tab = 'calc' | 'recipes' | 'inventory' | 'history';

export default function App() {
  const items = useLiveQuery(() => db.items.toArray(), []);
  const recipes = useLiveQuery(() => db.recipes.orderBy('name').toArray(), []);
  const mixes = useLiveQuery(() => db.mixes.orderBy('date').reverse().toArray(), []);
  const [tab, setTab] = useState<Tab>('calc');
  const [draft, setDraft] = useState<Draft | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const importDialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<{ fileName: string; data: Backup } | null>(null);
  const [notice, setNotice] = useState('');

  if (!items || !recipes || !mixes) return null;

  const lowCount = items.filter((i) => stockStatus(i) !== 'ok').length;
  const tabs: [Tab, string][] = [
    ['calc', 'Calculator'],
    ['recipes', `Recipes (${recipes.length})`],
    ['inventory', lowCount ? `Inventory · ${lowCount} low` : 'Inventory'],
    ['history', 'History'],
  ];

  async function onImport(file: File | undefined) {
    if (!file) return;
    try {
      setPending({ fileName: file.name, data: await readBackup(file) });
      importDialog.current?.showModal();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  async function applyImport(mode: 'merge' | 'replace') {
    importDialog.current?.close();
    if (!pending) return;
    if (mode === 'replace') {
      if (!confirm('Delete ALL current recipes, inventory and history and replace them with this file?')) return;
      await replaceAll(pending.data);
      setNotice(`Replaced everything with ${pending.fileName}.`);
    } else {
      setNotice(`Merged ${pending.fileName}: ${await mergeIn(pending.data)}`);
    }
    setPending(null);
    setDraft(null);
  }

  return (
    <div className="container">
      <header className="header">
        <h1>💧 E-Juice Calculator</h1>
        <div className="row tight">
          <button onClick={exportBackup}>Export</button>
          <button onClick={() => fileInput.current?.click()}>Import</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              onImport(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </header>

      {notice && (
        <p className="banner notice row between">
          <span>{notice}</span>
          <button className="icon" aria-label="Dismiss" onClick={() => setNotice('')}>
            ✕
          </button>
        </p>
      )}

      <dialog ref={importDialog} onClose={() => setPending(null)}>
        {pending && (
          <>
            <h2>Import {pending.fileName}</h2>
            <p>
              This file has {pending.data.items.length} inventory items, {pending.data.recipes.length} recipes and{' '}
              {pending.data.mixes.length} history entries.
            </p>
            <p className="muted small">
              <strong>Merge</strong> adds anything new and updates items and recipes with the same name (including on-hand
              amounts). Everything else you have is kept.
            </p>
            <div className="row end wrap">
              <button onClick={() => importDialog.current?.close()}>Cancel</button>
              <button className="danger" onClick={() => applyImport('replace')}>
                Replace everything
              </button>
              <button className="primary" onClick={() => applyImport('merge')}>
                Merge
              </button>
            </div>
          </>
        )}
      </dialog>

      <nav className="tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === 'calc' && (
        <Calculator draft={draft ?? newDraft(items)} setDraft={setDraft} items={items} recipes={recipes} />
      )}
      {tab === 'recipes' && (
        <Recipes
          items={items}
          recipes={recipes}
          mixes={mixes}
          onOpen={(r) => {
            setDraft(recipeToDraft(r, items));
            setTab('calc');
          }}
        />
      )}
      {tab === 'inventory' && <Inventory items={items} recipes={recipes} />}
      {tab === 'history' && <History mixes={mixes} />}
    </div>
  );
}
