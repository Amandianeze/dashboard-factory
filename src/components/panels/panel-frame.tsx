/**
 * Panel frame (docs/lld/panel-frame.md): the card every panel sits in. A named region (h2), an
 * optional description on a focusable ⓘ button (not title=), and an error boundary.
 */
import type { CSSProperties } from 'react';
import type { PanelFrameProps } from '../../../docs/lld/panel-frame.props';
import { PanelErrorBoundary } from '../../renderers/PanelRenderer';
import { Button } from '../ui/button';
import { Tooltip } from '../ui/tooltip';

export type { PanelFrameProps };

export function PanelFrame({
  id,
  title,
  description,
  kind,
  span,
  actions,
  children,
}: PanelFrameProps) {
  return (
    <section
      className="panel"
      style={{ '--span': span } as CSSProperties}
      data-testid={`panel-${id}`}
      data-kind={kind}
      aria-labelledby={`panel-${id}-title`}
    >
      <div className="panel-head">
        <h2 id={`panel-${id}-title`}>{title}</h2>
        {description && (
          <Tooltip content={description}>
            <Button variant="ghost" size="sm" aria-label={`About ${title}`}>
              ⓘ
            </Button>
          </Tooltip>
        )}
        {actions}
      </div>
      <div className="panel-body">
        <PanelErrorBoundary>{children}</PanelErrorBoundary>
      </div>
    </section>
  );
}
