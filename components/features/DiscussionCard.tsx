import { IconHandStop, IconMessageCircle, IconShieldCheck } from '@tabler/icons-react';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { formatRelativeTime } from '@/lib/time';
import type { Discussion } from '@/lib/types';
import { cn } from '@/lib/utils';

type DiscussionCardProps = {
  discussion: Discussion;
  /** Renders at reduced opacity — used for the non-member preview state,
   * where discussions are visible but signal "you're seeing a preview." */
  muted?: boolean;
};

export function DiscussionCard({ discussion, muted = false }: DiscussionCardProps) {
  return (
    <Card className={cn('flex flex-col gap-3', muted && 'opacity-85')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar name={discussion.authorName} size="sm" decorative />
          <span className="text-sm font-medium text-ink">{discussion.authorName}</span>
          {discussion.authorIsEducator && (
            <IconShieldCheck className="size-4 text-deep-fresh" aria-label="Educator" />
          )}
          <span className="text-xs text-sand">· {formatRelativeTime(discussion.createdAt)}</span>
        </div>
        {discussion.kind !== 'discussion' && (
          <Chip
            label={discussion.kind === 'announcement' ? 'Announcement' : 'Event'}
            color="sage"
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        {discussion.title && <h3 className="text-sm font-medium text-ink">{discussion.title}</h3>}
        <p className="text-sm text-oak">{discussion.content}</p>
      </div>

      <div className="flex items-center gap-4 text-sm text-oak">
        <span className="inline-flex items-center gap-1.5">
          <IconMessageCircle className="size-4" aria-hidden="true" />
          {discussion.replyCount} repl{discussion.replyCount === 1 ? 'y' : 'ies'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IconHandStop className="size-4" aria-hidden="true" />
          {discussion.cheerCount} cheers
        </span>
      </div>
    </Card>
  );
}
