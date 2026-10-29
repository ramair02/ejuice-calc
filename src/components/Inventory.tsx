import { useState } from 'react';
import type { Carrier } from '../lib/calc';
import { db, round2, uid, type Item, type Recipe } from '../lib/db';
import { NumberInput } from './NumberInput';

interface Props {
  items: Item[];
  recipes: Recipe[];
}

export const stockStatus = (i: Item) => (i.ml <= 0 ? 'out' : i.ml <= i.lowMl ? 'low' : 'ok');
const STATUS_LABEL = { out: 'Out', low: 'Low', ok: 'OK' };

export function Inventory({ items, recipes }: Props) {
  const [newFlavor, setNewFlavor] = useState('');
  const bases = items.filter((i) => i.kind !== 'flavor').sort((a, b) => a.kind.localeCompare(b.kind));
  const flavors = items.filter((i) => i.kind === 'flavor').sort((a, b) => a.name.localeCompare(b.name));
  const allEmpty = items.every((i) => i.ml === 0);

  const usedIn = (i: Item) =>
    recipes.filter((r) => r.nicBaseId === i.id || r.flavors.some((f) => f.itemId === i.id)).map((r) => r.name);

  async function rename(item: Item, name: string) {
    name = name.trim();
    if (!name || name === item.name) return;
    const clash = items.some((i) => i.id !== item.id && i.kind === item.kind && i.name.toLowerCase() === name.toLowerCase());
    if (clash) return alert(`There's already an item called "${name}".`);
    await db.items.update(item.id, { name });
  }

  async function remove(item: Item) {
    const used = usedIn(item);
    if (used.length) return alert(`"${item.name}" is used in: ${used.join(', ')}.\nRemove it from those recipes first.`);
    if (confirm(`Remove "${item.name}" from inventory?`)) await db.items.delete(item.id);
  }

  async function addFlavor() {
    const name = newFlavor.trim();
    if (!name) return;
    if (flavors.some((f) => f.name.toLowerCase() === name.toLowerCase())) return alert(`"${name}" is already in inventory.`);
    await db.items.add({ id: uid(), kind: 'flavor', name, carrier: 'PG', ml: 0, lowMl: 5 });
    setNewFlavor('');
  }

  const addNicBase = () =>
    db.items.add({ id: uid(), kind: 'nic', name: 'New nicotine base', strength: 100, pgPct: 100, ml: 0, lowMl: 10 });

  const row = (item: Item) => {
    const status = stockStatus(item);
    const used = usedIn(item).length;
    return (
      <tr key={item.id}>
        <td>
          {item.kind === 'pg' || item.kind === 'vg' ? (
            <strong>{item.name}</strong>
          ) : (
            <input key={item.name} defaultValue={item.name} onBlur={(e) => rename(item, e.target.value)} />
          )}
          {used > 0 && <div className="muted small">in {used} recipe{used > 1 ? 's' : ''}</div>}
        </td>
        <td>
          {item.kind === 'flavor' && (
            <select value={item.carrier} onChange={(e) => db.items.update(item.id, { carrier: e.target.value as Carrier })}>
              <option value="PG">PG</option>
              <option value="VG">VG</option>
              <option value="Other">Other</option>
            </select>
          )}
          {item.kind === 'nic' && (
            <span className="row tight">
              <NumberInput
                className="narrow"
                value={item.strength ?? 0}
                onChange={(strength) => db.items.update(item.id, { strength })}
              />
              <span className="muted small">mg/mL</span>
              <NumberInput
                className="narrow"
                value={item.pgPct ?? 100}
                min={0}
                max={100}
                onChange={(pgPct) => db.items.update(item.id, { pgPct })}
              />
              <span className="muted small">% PG</span>
            </span>
          )}
        </td>
        <td>
          <NumberInput className="narrow" value={item.ml} min={0} onChange={(ml) => db.items.update(item.id, { ml })} />
        </td>
        <td>
          <Restock item={item} />
        </td>
        <td>
          <NumberInput className="narrow" value={item.lowMl} min={0} onChange={(lowMl) => db.items.update(item.id, { lowMl })} />
        </td>
        <td>
          <span className={`chip ${status}`}>{STATUS_LABEL[status]}</span>
        </td>
        <td>
          {(item.kind === 'flavor' || item.kind === 'nic') && (
            <button className="icon" aria-label={`Remove ${item.name}`} onClick={() => remove(item)}>
              ✕
            </button>
          )}
        </td>
      </tr>
    );
  };

  const head = (detail: string) => (
    <thead>
      <tr>
        <th>Name</th>
        <th>{detail}</th>
        <th>On hand (mL)</th>
        <th>Restock</th>
        <th>Low at (mL)</th>
        <th>Status</th>
        <th />
      </tr>
    </thead>
  );

  return (
    <div className="stack">
      {allEmpty && (
        <p className="banner">
          Everything starts at 0 mL. Enter how much of each bottle you have so recipes can tell you what you can make.
        </p>
      )}
      <section className="card">
        <div className="row between">
          <h2>Bases</h2>
          <button onClick={addNicBase}>+ Nicotine base</button>
        </div>
        <div className="table-wrap">
          <table className="inventory">
            {head('Details')}
            <tbody>{bases.map(row)}</tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <div className="row between wrap">
          <h2>
            Flavors <span className="muted">{flavors.length}</span>
          </h2>
          <form
            className="row tight"
            onSubmit={(e) => {
              e.preventDefault();
              addFlavor();
            }}
          >
            <input placeholder="New flavor (e.g. TFA Strawberry)" value={newFlavor} onChange={(e) => setNewFlavor(e.target.value)} />
            <button type="submit">Add</button>
          </form>
        </div>
        <div className="table-wrap">
          <table className="inventory">
            {head('Carrier')}
            <tbody>{flavors.map(row)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Restock({ item }: { item: Item }) {
  const [text, setText] = useState('');
  const amount = parseFloat(text);
  return (
    <form
      className="row tight"
      onSubmit={(e) => {
        e.preventDefault();
        if (amount > 0) db.items.update(item.id, { ml: round2(item.ml + amount) });
        setText('');
      }}
    >
      <input
        className="narrow"
        type="number"
        inputMode="decimal"
        min={0}
        placeholder="+mL"
        aria-label={`Restock ${item.name}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" disabled={!(amount > 0)}>
        Add
      </button>
    </form>
  );
}
