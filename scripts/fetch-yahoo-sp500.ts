/**
 * Snapshot the latest S&P 500 (^GSPC) session from Yahoo Finance: 5-minute OHLCV bars plus session
 * metadata. The snapshot is committed; `npm run data:fixtures` derives fixtures from it, so renders
 * stay reproducible until the snapshot is refreshed on purpose.
 * Usage: npm run data:yahoo
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SNAPSHOT = join(import.meta.dirname, 'snapshots', 'yahoo-gspc-1d-5m.json');

const URL = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=1d&interval=5m';

type Quote = Record<'open' | 'high' | 'low' | 'close' | 'volume', (number | null)[]>;
type ChartResult = {
  meta: {
    symbol: string;
    currency: string;
    exchangeTimezoneName: string;
    gmtoffset: number;
    regularMarketTime: number;
    regularMarketPrice: number;
    chartPreviousClose: number;
  };
  timestamp: number[];
  indicators: { quote: Quote[] };
};

const res = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
if (!res.ok) throw new Error(`Yahoo Finance responded ${res.status} ${res.statusText}`);
const body = (await res.json()) as { chart: { result: ChartResult[] | null; error: unknown } };
const result = body.chart.result?.[0];
if (!result) throw new Error(`Yahoo Finance returned no data: ${JSON.stringify(body.chart.error)}`);

const { meta, timestamp } = result;
const snapshot = {
  source: URL,
  meta: {
    symbol: meta.symbol,
    currency: meta.currency,
    exchangeTimezoneName: meta.exchangeTimezoneName,
    gmtoffset: meta.gmtoffset,
    regularMarketTime: meta.regularMarketTime,
    regularMarketPrice: meta.regularMarketPrice,
    previousClose: meta.chartPreviousClose,
  },
  timestamp,
  quote: result.indicators.quote[0],
};

mkdirSync(join(SNAPSHOT, '..'), { recursive: true });
writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`wrote ${timestamp.length} bars → scripts/snapshots/yahoo-gspc-1d-5m.json`);
