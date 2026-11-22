/** Icon (docs/lld/icon.md). Proposed; wraps a lucide-react icon (ADR-003). */
import type { ComponentType, SVGProps } from 'react';

/** Any lucide-react icon component (typed structurally so this file needs no dependency yet). */
export type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

export interface IconProps {
  icon: IconComponent;
  /** Matches the type scale: sm = caption, md = body, lg = heading. Default md. */
  size?: 'sm' | 'md' | 'lg';
  /** When set, the icon is meaningful: role="img" + aria-label. Otherwise aria-hidden. */
  label?: string;
}
