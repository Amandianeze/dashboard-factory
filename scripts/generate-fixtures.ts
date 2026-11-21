/**
 * Deterministic fixture data so dashboards render (and screenshot-diff) identically everywhere.
 * Usage: npm run data:fixtures
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

type YahooSnapshot = {
  meta: { gmtoffset: number; regularMarketPrice: number; previousClose: number };
  timestamp: number[];
  quote: Record<'open' | 'high' | 'low' | 'close' | 'volume', (number | null)[]>;
};

const cents = (n: number) => Math.round(n * 100) / 100;

/** S&P 500 session from the committed Yahoo snapshot (`npm run data:yahoo` refreshes it). */
function sp500Session() {
  const snap = JSON.parse(
    readFileSync(join(import.meta.dirname, 'snapshots', 'yahoo-gspc-1d-5m.json'), 'utf8'),
  ) as YahooSnapshot;
  const { open, high, low, close, volume } = snap.quote;
  const bars = [];
  for (const [i, ts] of snap.timestamp.entries()) {
    const [o, h, l, c] = [open[i], high[i], low[i], close[i]];
    if (o == null || h == null || l == null || c == null) continue;
    // Exchange-local wall time without an offset, so axes read 09:30–16:00 in every browser.
    const time = new Date((ts + snap.meta.gmtoffset) * 1000).toISOString().slice(0, 19);
    bars.push({
      time,
      open: cents(o),
      high: cents(h),
      low: cents(l),
      close: cents(c),
      volume: volume[i] ?? 0,
    });
  }
  const first = bars[0];
  if (!first) throw new Error('Yahoo snapshot has no complete bars; rerun npm run data:yahoo');
  const { previousClose, regularMarketPrice: last } = snap.meta;
  const summary = {
    date: first.time.slice(0, 10),
    previous_close: previousClose,
    open: first.open,
    high: Math.max(...bars.map((b) => b.high)),
    low: Math.min(...bars.map((b) => b.low)),
    close: last,
    change: cents(last - previousClose),
    change_pct: (last - previousClose) / previousClose,
  };
  return { bars, summary: [summary] };
}

mkdirSync(OUT, { recursive: true });
const rows = salesDaily();
writeFileSync(join(OUT, 'sales_daily.json'), JSON.stringify(rows));
console.log(`wrote ${rows.length} rows → public/data/sales_daily.json`);

const { bars, summary } = sp500Session();
writeFileSync(join(OUT, 'sp500_intraday.json'), JSON.stringify(bars));
console.log(`wrote ${bars.length} rows → public/data/sp500_intraday.json`);
writeFileSync(join(OUT, 'sp500_session.json'), JSON.stringify(summary));
console.log(`wrote ${summary.length} rows → public/data/sp500_session.json`);
