import { distinctValues, type FilterState, type Row } from '../data/transforms';
import type { FilterSpec } from '../spec/types';

interface Props {
  filters: FilterSpec[];
  data: Record<string, Row[]>;
  state: FilterState;
  onChange: (next: FilterState) => void;
}

export function FilterBar({ filters, data, state, onChange }: Props) {
  if (!filters.length) return null;
  const set = (id: string, values: string[]) => onChange({ ...state, [id]: values });

  return (
    <div className="filter-bar" role="group" aria-label="Filters">
      {filters.map((f) => {
        const options = distinctValues(data[f.dataset] ?? [], f.field);
        const selected = state[f.id] ?? [];
        if (f.type === 'select')
          return (
            <label key={f.id} className="filter">
              <span>{f.label}</span>
              <select
                value={selected[0] ?? ''}
                onChange={(e) => set(f.id, e.target.value ? [e.target.value] : [])}
              >
                <option value="">All</option>
                {options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          );
        return (
          <fieldset key={f.id} className="filter">
            <legend>{f.label}</legend>
            {options.map((o) => {
              const on = selected.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  onClick={() => set(f.id, on ? selected.filter((s) => s !== o) : [...selected, o])}
                >
                  {o}
                </button>
              );
            })}
            {selected.length > 0 && (
              <button type="button" className="chip chip-clear" onClick={() => set(f.id, [])}>
                Clear
              </button>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
