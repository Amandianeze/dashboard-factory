/** Title band (docs/lld/title-band.md). Today inlined in DashboardView and App; extraction target. */
import type { ReactNode } from 'react';

export interface TitleBandProps {
  /** The page's h1. One per page. */
  title: string;
  /** Who the page is for and which decisions it supports. Plain text or inline links. */
  description?: ReactNode;
}
