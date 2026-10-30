import { useEffect, useState } from 'react';
import type { DatasetSpec } from '../spec/types';
import type { Row } from './transforms';

export async function loadDataset(ds: DatasetSpec, signal?: AbortSignal): Promise<Row[]> {
  const url = ds.source === 'fixture' ? `${import.meta.env.BASE_URL}data/${ds.path}` : ds.endpoint;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const body: unknown = await res.json();
  if (!Array.isArray(body)) throw new Error(`${url}: expected an array of rows`);
  return body as Row[];
}

type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: Record<string, Row[]> };

/** Load every dataset a dashboard declares, in parallel. */
export function useDatasets(datasets: Record<string, DatasetSpec>): State {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    Promise.all(
      Object.entries(datasets).map(
        async ([id, ds]) => [id, await loadDataset(ds, ctrl.signal)] as const,
      ),
    )
      .then((entries) => setState({ status: 'ready', data: Object.fromEntries(entries) }))
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setState({ status: 'error', error: String(e) });
      });
    return () => ctrl.abort();
  }, [datasets]);
  return state;
}
