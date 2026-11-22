/** Navigation card (docs/lld/nav-card.md): one dashboard on the index, or its validation errors. */
import type { NavCardProps } from '../../../docs/lld/nav-card.props';

export type { NavCardProps };

export function NavCard({ href, title, description, file, errors }: NavCardProps) {
  return (
    <li className="nav-card">
      {errors?.length || !href ? (
        <>
          <h2>{title}</h2>
          <ul className="panel-error">
            {(errors ?? []).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </>
      ) : (
        <a href={href}>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
          <code>{file}</code>
        </a>
      )}
    </li>
  );
}
