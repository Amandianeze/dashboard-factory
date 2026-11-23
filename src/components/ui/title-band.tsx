/** Title band (docs/lld/title-band.md): the page's h1 and who it is for. */
import type { TitleBandProps } from '../../../docs/lld/title-band.props';

export type { TitleBandProps };

export function TitleBand({ title, description, actions }: TitleBandProps) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header-text">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="dashboard-header-actions">{actions}</div>}
    </header>
  );
}
