import type { FilterBarProps } from '../../docs/lld/filter-bar.props';
import { FilterChip } from '../components/panels/filter-chip';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { distinctValues } from '../data/transforms';

export type { FilterBarProps };

export function FilterBar({ filters, data, state, onChange }: FilterBarProps) {
  if (!filters.length) return null;
  const set = (id: string, values: string[]) => onChange({ ...state, [id]: values });

  return (
    <div className="filter-bar" role="group" aria-label="Filters">
      {filters.map((f) => {
        const options = distinctValues(data[f.dataset] ?? [], f.field);
        const selected = state[f.id] ?? [];
        if (f.type === 'select')
          return (
            <Select
              key={f.id}
              label={f.label}
              options={options}
              value={selected[0] ?? null}
              onChange={(v) => set(f.id, v === null ? [] : [v])}
            />
          );
        return (
          <fieldset key={f.id} className="filter">
            <legend>{f.label}</legend>
            {options.map((o) => {
              const on = selected.includes(o);
              return (
                <FilterChip
                  key={o}
                  label={o}
                  pressed={on}
                  onPressedChange={(p) =>
                    set(f.id, p ? [...selected, o] : selected.filter((s) => s !== o))
                  }
                />
              );
            })}
            {selected.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => set(f.id, [])}>
                Clear
              </Button>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
