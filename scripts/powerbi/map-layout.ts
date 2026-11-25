/** Snap Power BI pixel positions (x, y, width, height) onto the 12-column LayoutRow grid. */
import type { DashboardSpec } from '../../src/spec/types';
import type { PbirPosition, ReportEntry } from './types';

type LayoutRow = DashboardSpec['layout']['rows'][number];

export interface PlacedPanel {
  panelId: string;
  kind: 'kpi-card' | 'chart-panel' | 'data-table';
  position: PbirPosition;
  title: string;
}

const MIN_SPAN: Record<PlacedPanel['kind'], number> = {
  'kpi-card': 2,
  'chart-panel': 3,
  'data-table': 4,
};

function overlapArea(a: PbirPosition, b: PbirPosition): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
}

function verticalOverlapRatio(a: PbirPosition, b: PbirPosition): number {
  const y1 = Math.max(a.y, b.y);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const ov = Math.max(0, y2 - y1);
  const minH = Math.min(a.height, b.height);
  return minH > 0 ? ov / minH : 0;
}

function allocateSpans(rowPanels: PlacedPanel[], contentWidth: number): number[] {
  if (rowPanels.length === 1) {
    const p = rowPanels[0]!;
    if (p.kind === 'kpi-card' && contentWidth > 0 && p.position.width / contentWidth < 0.45) {
      return [Math.max(4, Math.min(12, Math.round((p.position.width / contentWidth) * 12)))];
    }
    return [12];
  }

  const totalW = rowPanels.reduce((s, p) => s + Math.max(1, p.position.width), 0);
  const mins = rowPanels.map((p) => MIN_SPAN[p.kind]);
  const raw = rowPanels.map((p, i) =>
    Math.max(mins[i]!, (Math.max(1, p.position.width) / totalW) * 12),
  );
  const spans = raw.map((r, i) => Math.max(mins[i]!, Math.floor(r)));
  let diff = 12 - spans.reduce((a, b) => a + b, 0);

  // Distribute remainder by largest fractional part
  const order = raw
    .map((r, i) => ({ i, frac: r - spans[i]!, w: rowPanels[i]!.position.width }))
    .sort((a, b) => b.frac - a.frac || b.w - a.w);

  while (diff > 0) {
    for (const item of order) {
      if (diff <= 0) break;
      spans[item.i] = spans[item.i]! + 1;
      diff--;
    }
  }
  while (diff < 0) {
    // Trim from widest cells that exceed their minimum
    const trimOrder = spans
      .map((s, i) => ({ i, slack: s - mins[i]! }))
      .filter((x) => x.slack > 0)
      .sort((a, b) => b.slack - a.slack);
    if (trimOrder.length === 0) break;
    for (const item of trimOrder) {
      if (diff >= 0) break;
      spans[item.i] = spans[item.i]! - 1;
      diff++;
    }
  }

  return spans;
}

function splitCrowdedRow(rowPanels: PlacedPanel[]): PlacedPanel[][] {
  const chunks: PlacedPanel[][] = [];
  let current: PlacedPanel[] = [];
  let minSum = 0;
  for (const p of rowPanels) {
    const need = MIN_SPAN[p.kind];
    if (current.length > 0 && minSum + need > 12) {
      chunks.push(current);
      current = [p];
      minSum = need;
    } else {
      current.push(p);
      minSum += need;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function computeRowHeight(rowPanels: PlacedPanel[], pageHeight: number): number {
  if (rowPanels.every((p) => p.kind === 'kpi-card')) return 132;
  const maxH = Math.max(...rowPanels.map((p) => p.position.height));
  const scaled = (maxH * 900) / Math.max(400, pageHeight);
  const clamped = Math.max(260, Math.min(520, scaled));
  return Math.round(clamped / 20) * 20;
}

/** Convert pixel-positioned panels into schema-valid 12-column LayoutRow[]. */
export function mapPixelsToGrid(
  panels: PlacedPanel[],
  pageHeight: number,
  approximated: ReportEntry[],
): LayoutRow[] {
  if (panels.length === 0) return [];

  // 1. Separate heavily overlapping visuals (e.g. bookmark-toggled stacks) by z-index
  const sortedByZ = [...panels].sort((a, b) => b.position.z - a.position.z);
  const primary: PlacedPanel[] = [];
  const overflow: PlacedPanel[] = [];

  for (const p of sortedByZ) {
    const pArea = Math.max(1, p.position.width * p.position.height);
    const overlapsExisting = primary.find((other) => {
      const ov = overlapArea(p.position, other.position);
      const minA = Math.min(pArea, Math.max(1, other.position.width * other.position.height));
      return ov / minA > 0.5;
    });
    if (overlapsExisting) {
      overflow.push(p);
      approximated.push({
        category: 'layout',
        source: p.panelId,
        target: p.panelId,
        detail: `overlapped "${overlapsExisting.panelId}" (>50% area); moved to trailing row`,
      });
    } else {
      primary.push(p);
    }
  }

  // 2. Content bounding box width (excludes removed slicer/nav strips)
  const minX = Math.min(...primary.map((p) => p.position.x));
  const maxX = Math.max(...primary.map((p) => p.position.x + p.position.width));
  const contentWidth = Math.max(1, maxX - minX);

  // 3. Cluster into rows by vertical overlap
  const byY = [...primary].sort(
    (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
  );
  const rawRows: PlacedPanel[][] = [];

  for (const p of byY) {
    let placed = false;
    for (const row of rawRows) {
      // Join a row only if it overlaps vertically with all existing members (>=35%) and doesn't overlap horizontally
      const matchesVertically = row.every(
        (m) => verticalOverlapRatio(p.position, m.position) >= 0.35,
      );
      const collidesHorizontally = row.some((m) => {
        const hx =
          Math.min(p.position.x + p.position.width, m.position.x + m.position.width) -
          Math.max(p.position.x, m.position.x);
        return hx > Math.min(p.position.width, m.position.width) * 0.25;
      });
      if (matchesVertically && !collidesHorizontally) {
        row.push(p);
        placed = true;
        break;
      }
    }
    if (!placed) rawRows.push([p]);
  }

  // Append any bookmark-overlapped overflow panels as trailing rows (max 2 per row)
  if (overflow.length > 0) {
    for (let i = 0; i < overflow.length; i += 2) {
      rawRows.push(overflow.slice(i, i + 2));
    }
  }

  // 4. Sort each row left-to-right, split crowded rows, allocate spans and heights
  const layoutRows: LayoutRow[] = [];
  for (const rawRow of rawRows) {
    rawRow.sort((a, b) => a.position.x - b.position.x);
    const chunks = splitCrowdedRow(rawRow);
    if (chunks.length > 1) {
      approximated.push({
        category: 'layout',
        source: rawRow.map((p) => p.panelId).join(', '),
        detail: `row split into ${chunks.length} rows to preserve readable minimum panel spans`,
      });
    }
    for (const chunk of chunks) {
      const spans = allocateSpans(chunk, contentWidth);
      layoutRows.push({
        height: computeRowHeight(chunk, pageHeight),
        cells: chunk.map((p, i) => ({ panel: p.panelId, span: spans[i]! })),
      });
    }
  }

  return layoutRows;
}
