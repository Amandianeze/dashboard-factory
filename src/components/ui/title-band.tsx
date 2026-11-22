/** Title band (docs/lld/title-band.md): the page's h1 and who it is for. */
import type { TitleBandProps } from '../../../docs/lld/title-band.props';

export type { TitleBandProps };

export function TitleBand({ title, description }: TitleBandProps) {
  return (
    <header className="dashboard-header">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}
