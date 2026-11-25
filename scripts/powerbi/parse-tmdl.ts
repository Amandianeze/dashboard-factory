/** Indented-block TMDL parser for model.tmdl, relationships.tmdl, and tables/*.tmdl. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type {
  TmdlColumn,
  TmdlDataType,
  TmdlMeasure,
  TmdlModel,
  TmdlRelationship,
  TmdlTable,
} from './types';

const VALID_DATA_TYPES = new Set<TmdlDataType>([
  'string',
  'int64',
  'double',
  'dateTime',
  'decimal',
  'boolean',
  'binary',
  'variant',
]);

function countTabs(line: string): number {
  let n = 0;
  while (n < line.length && line[n] === '\t') n++;
  return n;
}

/** Unquote a single-quoted TMDL identifier ('My Table' -> My Table, '' -> '). */
export function parseTmdlIdent(raw: string): string {
  const s = raw.trim();
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  return s;
}

/** Parse a `Table.Column` or `'My Table'.'My Col'` reference. */
export function parseTableColumnRef(raw: string): { table: string; column: string } | null {
  const s = raw.trim();
  let i = 0;
  const readPart = (): string | null => {
    if (i >= s.length) return null;
    if (s[i] === "'") {
      i++;
      let out = '';
      while (i < s.length) {
        if (s[i] === "'" && s[i + 1] === "'") {
          out += "'";
          i += 2;
        } else if (s[i] === "'") {
          i++;
          return out;
        } else {
          out += s[i++];
        }
      }
      return null;
    }
    const start = i;
    while (i < s.length && s[i] !== '.') i++;
    return s.slice(start, i).trim();
  };
  const table = readPart();
  if (!table || s[i] !== '.') return null;
  i++;
  const column = readPart();
  if (!column) return null;
  return { table, column };
}

/** Parse an object header like `measure 'Total Rev' = SUM(...)` or `column Revenue`. */
function splitDeclaration(
  rest: string,
): { name: string; hasEquals: boolean; exprStart: string } | null {
  const s = rest.trim();
  if (!s) return null;
  let i = 0;
  let name = '';
  if (s[0] === "'") {
    i = 1;
    while (i < s.length) {
      if (s[i] === "'" && s[i + 1] === "'") {
        name += "'";
        i += 2;
      } else if (s[i] === "'") {
        i++;
        break;
      } else {
        name += s[i++];
      }
    }
  } else {
    while (i < s.length && s[i] !== ' ' && s[i] !== '=' && s[i] !== '\t') {
      name += s[i++];
    }
  }
  const tail = s.slice(i).trim();
  if (tail.startsWith('=')) {
    return { name, hasEquals: true, exprStart: tail.slice(1).trim() };
  }
  return { name, hasEquals: false, exprStart: '' };
}

/** Parse one `tables/<name>.tmdl` file. */
export function parseTableTmdl(text: string): TmdlTable | null {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let table: TmdlTable | null = null;
  let currentMeasure: TmdlMeasure | null = null;
  let currentColumn: TmdlColumn | null = null;
  let inFence = false;
  let fenceTarget: 'measure' | 'ignore' = 'ignore';
  let fenceLines: string[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx]!;
    const trimmed = rawLine.trim();

    if (inFence) {
      if (trimmed === '```') {
        if (fenceTarget === 'measure' && currentMeasure) {
          currentMeasure.expression = fenceLines.join('\n').trim();
        }
        inFence = false;
        fenceTarget = 'ignore';
        fenceLines = [];
      } else {
        fenceLines.push(rawLine.replace(/^\t+/, ''));
      }
      continue;
    }

    if (!trimmed || trimmed.startsWith('///')) continue;
    const tabs = countTabs(rawLine);

    if (tabs === 0 && trimmed.startsWith('table ')) {
      const decl = splitDeclaration(trimmed.slice('table '.length));
      if (!decl) continue;
      table = {
        name: decl.name,
        isHidden: false,
        isPrivate: false,
        isCalculationGroup: false,
        columns: new Map(),
        measures: new Map(),
      };
      currentMeasure = null;
      currentColumn = null;
      continue;
    }

    if (!table) continue;

    if (tabs === 1) {
      currentMeasure = null;
      currentColumn = null;

      if (trimmed === 'isHidden') {
        table.isHidden = true;
      } else if (trimmed === 'isPrivate') {
        table.isPrivate = true;
      } else if (trimmed === 'calculationGroup') {
        table.isCalculationGroup = true;
      } else if (trimmed.startsWith('measure ')) {
        const decl = splitDeclaration(trimmed.slice('measure '.length));
        if (!decl) continue;
        const m: TmdlMeasure = {
          name: decl.name,
          table: table.name,
          expression: '',
          hasDynamicFormat: false,
          isHidden: false,
        };
        table.measures.set(m.name, m);
        currentMeasure = m;
        if (decl.hasEquals) {
          if (decl.exprStart === '```') {
            inFence = true;
            fenceTarget = 'measure';
            fenceLines = [];
          } else if (decl.exprStart) {
            m.expression = decl.exprStart;
          } else {
            // Unfenced multi-line expression indented deeper on subsequent lines
            const exprParts: string[] = [];
            while (idx + 1 < lines.length) {
              const nextLine = lines[idx + 1]!;
              const nextTrim = nextLine.trim();
              const nextTabs = countTabs(nextLine);
              if (
                nextTrim &&
                nextTabs <= 2 &&
                /^(formatString|formatStringDefinition|displayFolder|isHidden|lineageTag|dataCategory|annotation)\b/.test(
                  nextTrim,
                )
              ) {
                break;
              }
              if (nextTrim && nextTabs <= 1) break;
              exprParts.push(nextTrim);
              idx++;
            }
            m.expression = exprParts.join('\n').trim();
          }
        }
      } else if (trimmed.startsWith('column ')) {
        const decl = splitDeclaration(trimmed.slice('column '.length));
        if (!decl) continue;
        const c: TmdlColumn = {
          name: decl.name,
          table: table.name,
          dataType: 'unknown',
          isHidden: false,
          isKey: false,
        };
        table.columns.set(c.name, c);
        currentColumn = c;
        if (decl.hasEquals && decl.exprStart === '```') {
          inFence = true;
          fenceTarget = 'ignore';
          fenceLines = [];
        }
      }
      continue;
    }

    if (tabs >= 2) {
      if (trimmed.endsWith('= ```')) {
        if (currentMeasure && trimmed.startsWith('formatStringDefinition')) {
          currentMeasure.hasDynamicFormat = true;
        }
        inFence = true;
        fenceTarget = 'ignore';
        fenceLines = [];
        continue;
      }

      if (currentMeasure) {
        if (trimmed === 'isHidden') currentMeasure.isHidden = true;
        else if (trimmed.startsWith('formatString:'))
          currentMeasure.formatString = trimmed.slice('formatString:'.length).trim();
        else if (trimmed.startsWith('formatStringDefinition'))
          currentMeasure.hasDynamicFormat = true;
        else if (trimmed.startsWith('displayFolder:'))
          currentMeasure.displayFolder = trimmed.slice('displayFolder:'.length).trim();
      } else if (currentColumn) {
        if (trimmed === 'isHidden') currentColumn.isHidden = true;
        else if (trimmed === 'isKey') currentColumn.isKey = true;
        else if (trimmed.startsWith('dataType:')) {
          const dt = trimmed.slice('dataType:'.length).trim() as TmdlDataType;
          currentColumn.dataType = VALID_DATA_TYPES.has(dt) ? dt : 'unknown';
        } else if (trimmed.startsWith('formatString:')) {
          currentColumn.formatString = trimmed.slice('formatString:'.length).trim();
        } else if (trimmed.startsWith('summarizeBy:')) {
          currentColumn.summarizeBy = trimmed.slice('summarizeBy:'.length).trim();
        } else if (trimmed.startsWith('sourceColumn:')) {
          currentColumn.sourceColumn = parseTmdlIdent(trimmed.slice('sourceColumn:'.length));
        }
      }
    }
  }

  return table;
}

/** Parse `definition/relationships.tmdl`. */
export function parseRelationshipsTmdl(text: string): TmdlRelationship[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const rels: TmdlRelationship[] = [];
  let cur: Partial<TmdlRelationship> | null = null;

  const flush = () => {
    if (cur?.name && cur.fromTable && cur.fromColumn && cur.toTable && cur.toColumn) {
      rels.push({
        name: cur.name,
        fromTable: cur.fromTable,
        fromColumn: cur.fromColumn,
        toTable: cur.toTable,
        toColumn: cur.toColumn,
        isActive: cur.isActive ?? true,
        fromCardinality: cur.fromCardinality ?? 'many',
        toCardinality: cur.toCardinality ?? 'one',
        crossFilteringBehavior: cur.crossFilteringBehavior ?? 'oneDirection',
      });
    }
    cur = null;
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('///')) continue;
    const tabs = countTabs(rawLine);

    if (tabs === 0 && trimmed.startsWith('relationship ')) {
      flush();
      cur = { name: parseTmdlIdent(trimmed.slice('relationship '.length)) };
    } else if (tabs >= 1 && cur) {
      if (trimmed.startsWith('isActive:')) {
        cur.isActive = trimmed.slice('isActive:'.length).trim() !== 'false';
      } else if (trimmed.startsWith('fromColumn:')) {
        const ref = parseTableColumnRef(trimmed.slice('fromColumn:'.length));
        if (ref) {
          cur.fromTable = ref.table;
          cur.fromColumn = ref.column;
        }
      } else if (trimmed.startsWith('toColumn:')) {
        const ref = parseTableColumnRef(trimmed.slice('toColumn:'.length));
        if (ref) {
          cur.toTable = ref.table;
          cur.toColumn = ref.column;
        }
      } else if (trimmed.startsWith('fromCardinality:')) {
        const v = trimmed.slice('fromCardinality:'.length).trim();
        if (v === 'one' || v === 'many') cur.fromCardinality = v;
      } else if (trimmed.startsWith('toCardinality:')) {
        const v = trimmed.slice('toCardinality:'.length).trim();
        if (v === 'one' || v === 'many') cur.toCardinality = v;
      } else if (trimmed.startsWith('crossFilteringBehavior:')) {
        const v = trimmed.slice('crossFilteringBehavior:'.length).trim();
        if (v === 'oneDirection' || v === 'bothDirections' || v === 'automatic') {
          cur.crossFilteringBehavior = v;
        }
      }
    }
  }
  flush();
  return rels;
}

/** Read a `.SemanticModel/definition/` TMDL folder into a TmdlModel. */
export function readTmdlModel(semanticModelDir: string): TmdlModel {
  const defDir = join(semanticModelDir, 'definition');
  if (!existsSync(defDir)) {
    throw new Error(`TMDL definition directory not found: ${defDir}`);
  }

  let culture = 'en-US';
  const modelFile = join(defDir, 'model.tmdl');
  if (existsSync(modelFile)) {
    const m = /^\tculture:\s*(.+)$/m.exec(readFileSync(modelFile, 'utf8'));
    if (m?.[1]) culture = m[1].trim();
  }

  const relationshipsFile = join(defDir, 'relationships.tmdl');
  const relationships = existsSync(relationshipsFile)
    ? parseRelationshipsTmdl(readFileSync(relationshipsFile, 'utf8'))
    : [];

  const tables = new Map<string, TmdlTable>();
  const tablesDir = join(defDir, 'tables');
  if (existsSync(tablesDir)) {
    for (const file of readdirSync(tablesDir)
      .filter((f) => f.endsWith('.tmdl'))
      .sort()) {
      const parsed = parseTableTmdl(readFileSync(join(tablesDir, file), 'utf8'));
      if (parsed) tables.set(parsed.name, parsed);
    }
  }

  return { culture, tables, relationships };
}

/** Find a measure by (optional table, name) across a TmdlModel. */
export function findMeasure(
  model: TmdlModel,
  measureName: string,
  tableName?: string,
): TmdlMeasure | undefined {
  if (tableName) {
    const direct = model.tables.get(tableName)?.measures.get(measureName);
    if (direct) return direct;
  }
  for (const t of model.tables.values()) {
    const found = t.measures.get(measureName);
    if (found) return found;
  }
  return undefined;
}
