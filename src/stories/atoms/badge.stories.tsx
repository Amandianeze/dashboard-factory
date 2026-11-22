import { expect } from 'storybook/test';
import preview from '../../../.storybook/preview';
import { Badge } from '../../components/ui/badge';
import { BADGE_TONES } from '../../../docs/lld/badge.props';

const meta = preview.meta({
  title: 'Atoms/Badge',
  component: Badge,
  args: { children: 'Shipped', tone: 'success' },
});

export const Success = meta.story({ args: { tone: 'success', children: 'Shipped' } });
export const Warning = meta.story({ args: { tone: 'warning', children: 'Delayed' } });
export const Danger = meta.story({ args: { tone: 'danger', children: 'Cancelled' } });
export const Info = meta.story({ args: { tone: 'info', children: 'Pending' } });
export const Neutral = meta.story({ args: { tone: 'neutral', children: 'Draft' } });

/** Every tone side by side; the text names the status, the dot is decoration. */
export const AllTones = meta.story({
  render: () => (
    <div className="flex flex-wrap gap-(--space-inline-sm)">
      {BADGE_TONES.map((t) => (
        <Badge key={t} tone={t}>
          {t}
        </Badge>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    for (const t of BADGE_TONES) await expect(canvas.getByText(t)).toBeVisible();
  },
});
