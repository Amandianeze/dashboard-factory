import { useEffect, useState } from 'react';
import { EmptyState } from './components/ui/empty-state';
import { NavCard } from './components/ui/nav-card';
import { TitleBand } from './components/ui/title-band';
import { DashboardView } from './dashboard/DashboardView';
import { dashboards } from './dashboard/registry';
import { FoundationsPage } from './foundations/FoundationsPage';

const currentId = () => /^#\/d\/([^/]+)/.exec(window.location.hash)?.[1];
const currentPage = () => (window.location.hash === '#/foundations' ? 'foundations' : undefined);

export function App() {
  const [id, setId] = useState(currentId);
  const [page, setPage] = useState(currentPage);
  useEffect(() => {
    const onHash = () => {
      setId(currentId());
      setPage(currentPage());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const entry = id
    ? dashboards.find((d) => (d.result.ok ? d.result.spec.id === id : d.file.startsWith(id)))
    : undefined;

  if (page === 'foundations') return <FoundationsPage />;
  if (entry?.result.ok) return <DashboardView key={id} spec={entry.result.spec} />;

  return (
    <main className="dashboard">
      <TitleBand
        title="Dashboards"
        description={
          <>
            Each card is a spec in /dashboards. Invalid specs show their validation errors. Design
            tokens: <a href="#/foundations">Foundations</a>.
          </>
        }
      />
      {id && !entry && (
        <EmptyState
          variant="error"
          title={`No dashboard with id “${id}”`}
          description="Pick one of the dashboards below."
          size="compact"
        />
      )}
      <ul className="index">
        {dashboards.map(({ file, result }) => (
          <NavCard
            key={file}
            file={file}
            href={result.ok ? `#/d/${result.spec.id}` : undefined}
            title={result.ok ? result.spec.title : file}
            description={result.ok ? result.spec.description : undefined}
            errors={result.ok ? undefined : result.errors}
          />
        ))}
      </ul>
    </main>
  );
}
