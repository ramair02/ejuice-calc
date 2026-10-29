import { useRef, useState } from 'react';
import { db, type Item, type Recipe } from '../lib/db';
import { evaluate, mixBatch, newDraft, recipeToDraft, saveRecipe, type Draft } from '../lib/recipe';
import { NumberInput } from './NumberInput';

interface Props {
  draft: Draft;
  setDraft: (d: Draft) => void;
  items: Item[];
  recipes: Recipe[];
}

const fmt = (n: number) => n.toFixed(2);

export function Calculator({ draft, setDraft, items, recipes }: Props) {
  const ev = evaluate(draft, items);
  const { result, lines, isShort } = ev;
  const nicBases = items.filter((i) => i.kind === 'nic');
  const nicItem = nicBases.find((i) => i.id === draft.nicBaseId);
  const flavorItems = items.filter((i) => i.kind === 'flavor').sort((a, b) => a.name.localeCompare(b.name));
  const shortLines = lines.filter(isShort);
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState('');

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const setFlavor = (i: number, patch: Partial<Draft['flavors'][number]>) =>
    set({ flavors: draft.flavors.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(''), 3000);
  };

  async function save(asCopy = false) {
    if (!draft.name.trim()) return flash('Give the recipe a name first.');
    const name = asCopy ? `${draft.name.trim()} (copy)` : draft.name;
    const id = await saveRecipe({ ...draft, name, id: asCopy ? null : draft.id });
    setDraft({ ...draft, name, id });
    flash(asCopy ? 'Saved as a copy.' : 'Saved.');
  }

  async function remove() {
    if (!draft.id || !confirm(`Delete recipe "${draft.name}"?`)) return;
    await db.recipes.delete(draft.id);
    setDraft(newDraft(items));
    flash('Recipe deleted.');
  }

  async function mix() {
    dialog.current?.close();
    await mixBatch(draft);
    flash('Mixed! Inventory updated and logged in History.');
  }

  const canMix = result.problems.length === 0 && draft.batchMl > 0;

  return (
    <div className="stack">
      <section className="card">
        <div className="row wrap">
          <select
            className="grow"
            value={draft.id ?? ''}
            onChange={(e) => {
              const r = recipes.find((r) => r.id === e.target.value);
              setDraft(r ? recipeToDraft(r, items) : newDraft(items));
            }}
          >
            <option value="">— New recipe —</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button onClick={() => setDraft(newDraft(items))}>New</button>
        </div>
        <div className="row wrap" style={{ marginTop: 12 }}>
          <input
            className="grow"
            placeholder="Recipe name (e.g. Strawberry Cheesecake)"
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
          />
          <button className="primary" onClick={() => save()}>
            Save
          </button>
          {draft.id && <button onClick={() => save(true)}>Save copy</button>}
          {draft.id && (
            <button className="danger" onClick={remove}>
              Delete
            </button>
          )}
        </div>
        <textarea
          placeholder="Notes (steep time, tweaks, impressions…)"
          rows={2}
          value={draft.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
        {status && <p className="status">{status}</p>}
      </section>

      <section className="card">
        <h2>Target</h2>
        <div className="grid-4">
          <label>
            Amount to make (mL)
            <NumberInput value={draft.batchMl} min={0} step={1} onChange={(batchMl) => set({ batchMl })} />
          </label>
          <label>
            Strength (mg/mL)
            <NumberInput value={draft.nicMg} min={0} step={0.5} onChange={(nicMg) => set({ nicMg })} />
            <span className="hint">{fmt(result.nic.pct)}% nic base</span>
          </label>
          <label>
            PG / VG
            <span className="ratio">
              <NumberInput value={draft.pgPct} min={0} max={100} onChange={(pgPct) => set({ pgPct })} />
              <span>/</span>
              <NumberInput value={100 - draft.pgPct} min={0} max={100} onChange={(vg) => set({ pgPct: 100 - vg })} />
            </span>
          </label>
          <label>
            Nicotine base
            <select value={draft.nicBaseId ?? ''} onChange={(e) => set({ nicBaseId: e.target.value || null })}>
              <option value="">None</option>
              {nicBases.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
            {nicItem && (
              <span className="hint">
                {nicItem.strength} mg/mL · {nicItem.pgPct}/{100 - (nicItem.pgPct ?? 100)} PG/VG
              </span>
            )}
          </label>
        </div>
      </section>

      <section className="card">
        <div className="row between">
          <h2>
            Flavors <span className="muted">{fmt(result.flavorPct)}% total</span>
          </h2>
          <button onClick={() => set({ flavors: [...draft.flavors, { name: '', pct: 0 }] })}>+ Add flavor</button>
        </div>
        <datalist id="flavor-options">
          {flavorItems.map((f) => (
            <option key={f.id} value={f.name} />
          ))}
        </datalist>
        <div className="flavor-rows">
          {draft.flavors.map((f, i) => {
            const item = flavorItems.find((x) => x.name.toLowerCase() === f.name.trim().toLowerCase());
            return (
              <div className="flavor-row" key={i}>
                <input
                  list="flavor-options"
                  placeholder="Flavor"
                  value={f.name}
                  onChange={(e) => setFlavor(i, { name: e.target.value })}
                />
                <span className="pct">
                  <NumberInput value={f.pct} min={0} step={0.1} onChange={(pct) => setFlavor(i, { pct })} />%
                </span>
                <span className="muted small">
                  {!f.name.trim() ? '' : item ? `${item.carrier} · ${item.ml} mL on hand` : 'new — added to inventory on save'}
                </span>
                <button
                  className="icon"
                  aria-label="Remove flavor"
                  onClick={() => set({ flavors: draft.flavors.filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="row between">
          <h2>Mixing results</h2>
          <button className="primary" disabled={!canMix} onClick={() => dialog.current?.showModal()}>
            Mix this batch…
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ingredient</th>
                <th className="num">mL</th>
                <th className="num">Grams</th>
                <th className="num">%</th>
                <th className="num">On hand</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className={l.amount.ml < -0.005 ? 'bad' : ''}>
                  <td>
                    <span className={`dot ${l.kind}`} />
                    {l.label}
                  </td>
                  <td className="num">{fmt(l.amount.ml)}</td>
                  <td className="num">{fmt(l.amount.g)}</td>
                  <td className="num">{fmt(l.amount.pct)}%</td>
                  <td className={`num ${isShort(l) ? 'short' : 'muted'}`}>
                    {l.item ? `${fmt(l.item.ml)}` : '—'}
                  </td>
                </tr>
              ))}
              <tr className="total">
                <td>Total</td>
                <td className="num">{fmt(result.total.ml)}</td>
                <td className="num">{fmt(result.total.g)}</td>
                <td className="num">100%</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        {result.problems.map((p) => (
          <p key={p} className="warning">
            ⚠️ {p}
          </p>
        ))}
        {result.problems.length === 0 && shortLines.length > 0 && (
          <p className="warning soft">Not enough on hand: {shortLines.map((l) => l.label).join(', ')}.</p>
        )}
        {status && <p className="status">{status}</p>}
      </section>

      <dialog ref={dialog}>
        <h2>Mix {draft.name.trim() || 'this batch'}?</h2>
        <p>
          This deducts {draft.batchMl} mL worth of ingredients from your inventory and logs the batch in History.
          You can undo it from there.
        </p>
        {shortLines.length > 0 && (
          <p className="warning soft">
            Inventory says you don't have enough {shortLines.map((l) => l.label).join(', ')}. Those will be set to 0.
          </p>
        )}
        <div className="row end">
          <button onClick={() => dialog.current?.close()}>Cancel</button>
          <button className="primary" onClick={mix}>
            Mix &amp; deduct
          </button>
        </div>
      </dialog>
    </div>
  );
}
