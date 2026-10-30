import { useEffect, useState } from 'react';
import { DashboardView } from './dashboard/DashboardView';
import { dashboards } from './dashboard/registry';

const currentId = () => /^#\/d\/([^/]+)/.exec(window.location.hash)?.[1];

export function App() {
  const [id, setId] = useState(currentId);
  useEffect(() => {
    const onHash = () => setId(currentId());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const entry = id
    ? dashboards.find((d) => (d.result.ok ? d.result.spec.id === id : d.file.startsWith(id)))
    : undefined;

  if (entry?.result.ok) return <DashboardView key={id} spec={entry.result.spec} />;

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboards</h1>
        <p>Each card is a spec in /dashboards. Invalid specs show their validation errors.</p>
      </header>
      {id && !entry && <p className="panel-error">No dashboard with id “{id}”.</p>}
      <ul className="index">
        {dashboards.map(({ file, result }) => (
          <li key={file} className="panel">
            {result.ok ? (
              <a href={`#/d/${result.spec.id}`}>
                <h2>{result.spec.title}</h2>
                <p>{result.spec.description}</p>
                <code>{file}</code>
              </a>
            ) : (
              <>
                <h2>{file}</h2>
                <ul className="panel-error">
                  {result.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
