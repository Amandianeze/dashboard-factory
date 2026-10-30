import { parseDashboardYaml, type ValidationResult } from '../spec/validate';

/** Every dashboards/*.dashboard.yaml is bundled and validated at load time. */
const files = import.meta.glob('/dashboards/*.dashboard.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface DashboardEntry {
  file: string;
  result: ValidationResult;
}

export const dashboards: DashboardEntry[] = Object.entries(files)
  .map(([path, text]) => ({ file: path.split('/').pop()!, result: parseDashboardYaml(text) }))
  .sort((a, b) => a.file.localeCompare(b.file));
