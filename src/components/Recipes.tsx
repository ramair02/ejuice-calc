import { useState } from 'react';
import type { Item, Mix, Recipe } from '../lib/db';
import { evaluate, maxBatch, recipeToDraft } from '../lib/recipe';

interface Props {
  items: Item[];
  recipes: Recipe[];
  mixes: Mix[];
  onOpen: (r: Recipe) => void;
}

export function Recipes({ items, recipes, mixes, onOpen }: Props) {
  const [query, setQuery] = useState('');
  const byId = new Map(items.map((i) => [i.id, i]));
  const q = query.trim().toLowerCase();
  const shown = recipes.filter(
    (r) => !q || r.name.toLowerCase().includes(q) || r.flavors.some((f) => byId.get(f.itemId)?.name.toLowerCase().includes(q)),
  );

  return (
    <div className="stack">
      <input placeholder="Search recipes or flavors…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {shown.length === 0 && <p className="muted">No recipes match.</p>}
      <div className="recipe-grid">
        {shown.map((r) => {
          const draft = recipeToDraft(r, items);
          const ev = evaluate(draft, items);
          const max = maxBatch(draft, ev);
          const lastMix = mixes.find((m) => m.recipeId === r.id);
          return (
            <button key={r.id} className="card recipe-card" onClick={() => onOpen(r)}>
              <div className="row between">
                <strong>{r.name}</strong>
                <span className="muted small">{ev.result.flavorPct}% flavor</span>
              </div>
              <ul className="flavor-list">
                {draft.flavors.map((f, i) => (
                  <li key={i}>
                    <span>{f.name}</span>
                    <span className="muted">{f.pct}%</span>
                  </li>
                ))}
              </ul>
              {r.notes && <p className="muted small">{r.notes}</p>}
              <div className="recipe-foot">
                {max.ml >= r.batchMl ? (
                  <span className="chip ok">Can make {Math.floor(max.ml)} mL</span>
                ) : max.ml > 0 ? (
                  <span className="chip low">Up to {Math.floor(max.ml)} mL</span>
                ) : (
                  <span className="chip out" title={max.blockers.join(', ')}>
                    Need {max.blockers.length ? max.blockers.join(', ') : 'stock'}
                  </span>
                )}
                {lastMix && (
                  <span className="muted small">Last mixed {new Date(lastMix.date).toLocaleDateString()}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
