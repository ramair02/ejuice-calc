import type { Mix } from '../lib/db';
import { undoMix } from '../lib/recipe';

const daysAgo = (t: number) => {
  const d = Math.floor((Date.now() - t) / 86_400_000);
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

export function History({ mixes }: { mixes: Mix[] }) {
  if (mixes.length === 0) {
    return <p className="muted">No batches yet. Use “Mix this batch…” on the Calculator to log one and deduct it from inventory.</p>;
  }
  return (
    <div className="stack">
      {mixes.map((m) => (
        <details key={m.id} className="card mix">
          <summary>
            <span>
              <strong>{m.recipeName}</strong>
              <span className="muted"> · {m.batchMl} mL · {m.nicMg} mg · {m.pgPct}/{100 - m.pgPct}</span>
            </span>
            <span className="muted small" title={new Date(m.date).toLocaleString()}>
              {new Date(m.date).toLocaleDateString()} ({daysAgo(m.date)})
            </span>
          </summary>
          <table>
            <thead>
              <tr>
                <th>Ingredient</th>
                <th className="num">Used (mL)</th>
                <th className="num">Deducted (mL)</th>
              </tr>
            </thead>
            <tbody>
              {m.usage.map((u) => (
                <tr key={u.itemId + u.name}>
                  <td>{u.name}</td>
                  <td className="num">{u.ml.toFixed(2)}</td>
                  <td className={`num ${u.deducted < u.ml ? 'short' : ''}`}>{u.deducted.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row end">
            <button
              className="danger"
              onClick={() => confirm(`Undo "${m.recipeName}" and put its ingredients back in inventory?`) && undoMix(m.id)}
            >
              Undo &amp; restore inventory
            </button>
          </div>
        </details>
      ))}
    </div>
  );
}
