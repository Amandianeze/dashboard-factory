/**
 * Foundations: every theme's semantic colours, data-viz palettes, type scale and spacing, rendered
 * from the generated tokens. Each column scopes its theme with `data-theme`, so the swatches show
 * exactly what the CSS variables resolve to. Stand-in for the Storybook Foundations page (Phase 5).
 */
import type { CSSProperties } from 'react';
import { DENSITIES, THEMES, densities, themes, type ThemeName } from '../theme/generated/themes';

const THEME_LABEL: Record<ThemeName, string> = {
  light: 'Light',
  dark: 'Dark',
  hc: 'High contrast',
};

const SEMANTIC = [
  ['bg', ['canvas', 'surface', 'surface-raised', 'accent', 'accent-hover']],
  ['text', ['primary', 'muted', 'on-accent', 'danger']],
  ['border', ['subtle', 'control']],
  ['status', ['danger', 'warning', 'success', 'info']],
] as const;

const TYPE_SCALE = [
  'display',
  'title',
  'heading',
  'body-large',
  'body-strong',
  'body',
  'caption',
  'label',
] as const;

/** Keys of a token group in numeric order (1…10, -4…+4). */
const ordered = (group: Record<string, string>) =>
  Object.entries(group).sort(([a], [b]) => Number(a) - Number(b));

function Swatch({ cssVar, label, value }: { cssVar: string; label: string; value: string }) {
  return (
    <li className="swatch">
      <span className="swatch-chip" style={{ background: `var(${cssVar})` }} />
      <span className="swatch-name">{label}</span>
      <code className="swatch-value">{value}</code>
    </li>
  );
}

function Ramp({
  name,
  cssPrefix,
  stops,
}: {
  name: string;
  cssPrefix: string;
  stops: [string, string][];
}) {
  return (
    <figure className="ramp">
      <figcaption>{name}</figcaption>
      <div
        className="ramp-stops"
        role="img"
        aria-label={`${name}: ${stops.map(([, v]) => v).join(', ')}`}
      >
        {stops.map(([k, v]) => (
          <span
            key={k}
            title={`${k}: ${v}`}
            style={{ background: `var(${cssPrefix}-${k.replace(/^-/, 'm').replace(/^\+/, 'p')})` }}
          />
        ))}
      </div>
    </figure>
  );
}

function ThemeColumn({ theme }: { theme: ThemeName }) {
  const c = themes[theme].color;
  return (
    <section
      className="foundations-theme"
      data-theme={theme}
      aria-label={`${THEME_LABEL[theme]} theme`}
    >
      <h2>{THEME_LABEL[theme]}</h2>
      {SEMANTIC.map(([group, keys]) => (
        <div key={group}>
          <h3>color.{group}</h3>
          <ul className="swatches">
            {keys.map((k) => (
              <Swatch
                key={k}
                cssVar={`--color-${group}-${k}`}
                label={k}
                value={(c[group] as Record<string, string>)[k]!}
              />
            ))}
          </ul>
        </div>
      ))}
      <h3>color.data.categorical</h3>
      <ul className="swatches swatches-compact">
        {ordered(c.data.categorical).map(([k, v]) => (
          <Swatch key={k} cssVar={`--color-data-categorical-${k}`} label={k} value={v} />
        ))}
      </ul>
      <h3>color.data (ramps and signs)</h3>
      <Ramp
        name="sequential.blue"
        cssPrefix="--color-data-sequential-blue"
        stops={ordered(c.data.sequential.blue)}
      />
      <Ramp
        name="diverging.blue-orange"
        cssPrefix="--color-data-diverging-blue-orange"
        stops={ordered(c.data.diverging['blue-orange'])}
      />
      <ul className="swatches">
        {(['positive', 'negative', 'neutral', 'highlight'] as const).map((k) => (
          <Swatch key={k} cssVar={`--color-data-${k}`} label={k} value={c.data[k]} />
        ))}
      </ul>
    </section>
  );
}

export function FoundationsPage() {
  const t = themes.light.typography;
  return (
    <main className="dashboard" data-testid="foundations">
      <header className="dashboard-header">
        <h1>Foundations</h1>
        <p>
          Generated from <code>tokens/</code>. Values are placeholders until the rebrand. Contrast
          results: <code>docs/tokens/contrast-matrix.md</code>.
        </p>
      </header>

      <div className="foundations-themes">
        {THEMES.map((theme) => (
          <ThemeColumn key={theme} theme={theme} />
        ))}
      </div>

      <section className="panel" aria-labelledby="type-scale">
        <h2 id="type-scale">Type scale</h2>
        <ul className="type-scale">
          {TYPE_SCALE.map((k) => (
            <li key={k}>
              <span
                style={
                  {
                    font: `var(--typography-${k}-font)`,
                    letterSpacing: `var(--typography-${k}-letter-spacing)`,
                  } as CSSProperties
                }
              >
                {k === 'display' ? '3,496,113' : 'Weekly revenue by region'}
              </span>
              <code>
                typography.{k} · {t[k].fontSize}/{t[k].lineHeight} · {t[k].fontWeight}
              </code>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="spacing">
        <h2 id="spacing">Spacing by density</h2>
        <table className="token-table">
          <thead>
            <tr>
              <th scope="col">Token</th>
              {DENSITIES.map((d) => (
                <th key={d} scope="col">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(densities.comfortable.space).flatMap(([group, values]) =>
              Object.keys(values).map((k) => (
                <tr key={`${group}.${k}`}>
                  <th scope="row">
                    <code>
                      space.{group}.{k}
                    </code>
                  </th>
                  {DENSITIES.map((d) => (
                    <td key={d}>
                      {(densities[d].space as Record<string, Record<string, number>>)[group]![k]}px
                    </td>
                  ))}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
