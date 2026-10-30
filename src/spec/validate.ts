import { parse as parseYaml } from 'yaml';
import type { ZodError } from 'zod';
import { d3Catalog, isD3ChartName } from '../components/d3/catalog';
import { DashboardSpec } from './schema';

export type ValidationResult =
  { ok: true; spec: DashboardSpec; errors: [] } | { ok: false; spec?: undefined; errors: string[] };

const formatZod = (err: ZodError, prefix: (string | number)[] = []) =>
  err.issues.map((i) => `${[...prefix, ...i.path].join('.') || '(root)'}: ${i.message}`);

/** Validate a parsed object: schema, cross-references, then D3 catalog props. */
export function validateDashboard(input: unknown): ValidationResult {
  const parsed = DashboardSpec.safeParse(input);
  if (!parsed.success) return { ok: false, errors: formatZod(parsed.error) };

  const spec = parsed.data;
  const errors: string[] = [];
  for (const [id, panel] of Object.entries(spec.panels)) {
    if (panel.renderer !== 'd3') continue;
    if (!isD3ChartName(panel.component)) {
      errors.push(
        `panels.${id}.component: unknown D3 chart "${panel.component}" (known: ${Object.keys(d3Catalog).join(', ')})`,
      );
      continue;
    }
    const entry = d3Catalog[panel.component];
    const props = entry.propsSchema.safeParse(panel.props);
    if (!props.success) {
      errors.push(...formatZod(props.error, ['panels', id, 'props']));
      continue;
    }
    panel.props = props.data; // store with defaults applied
    const fields = spec.datasets[panel.dataset]?.fields ?? {};
    for (const key of entry.fieldProps) {
      const f = (props.data as Record<string, unknown>)[key];
      if (typeof f === 'string' && !(f in fields))
        errors.push(
          `panels.${id}.props.${key}: field "${f}" is not declared in dataset "${panel.dataset}"`,
        );
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, spec, errors: [] };
}

/** Parse YAML text and validate it. YAML syntax errors are reported as validation errors. */
export function parseDashboardYaml(text: string): ValidationResult {
  let data: unknown;
  try {
    data = parseYaml(text);
  } catch (e) {
    return { ok: false, errors: [`YAML: ${(e as Error).message}`] };
  }
  return validateDashboard(data);
}
