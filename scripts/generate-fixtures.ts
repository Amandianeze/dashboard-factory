/**
 * Deterministic fixture data so dashboards render (and screenshot-diff) identically everywhere.
 * Usage: npm run data:fixtures
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, '..', 'public', 'data');

/** mulberry32 — tiny seeded PRNG. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function salesDaily() {
  const rand = rng(42);
  const regions = { North: 1.2, South: 0.8, East: 1.0, West: 1.4 };
  const products = { Atlas: 140, Beacon: 85, Cobalt: 220, Drift: 60 };
  const start = Date.UTC(2026, 3, 5); // a Sunday: 119 days = 17 whole Vega-Lite (Sunday-start) weeks
  const rows = [];
  for (let day = 0; day < 119; day++) {
    const d = new Date(start + day * 86_400_000);
    const weekday = d.getUTCDay();
    const seasonal = 1 + 0.25 * Math.sin((day / 119) * Math.PI * 2) + day * 0.002;
    const weekend = weekday === 0 || weekday === 6 ? 0.7 : 1;
    for (const [region, rw] of Object.entries(regions))
      for (const [product, price] of Object.entries(products)) {
        const orders = Math.max(0, Math.round(rw * seasonal * weekend * (8 + rand() * 10)));
        rows.push({
          date: d.toISOString().slice(0, 10),
          region,
          product,
          orders,
          revenue: Math.round(orders * price * (0.9 + rand() * 0.2)),
        });
      }
  }
  return rows;
}

mkdirSync(OUT, { recursive: true });
const rows = salesDaily();
writeFileSync(join(OUT, 'sales_daily.json'), JSON.stringify(rows));
console.log(`wrote ${rows.length} rows → public/data/sales_daily.json`);
