'use client';

import { IconHandStop, IconMessageCircle, IconShieldCheck } from '@tabler/icons-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { RichContent } from '@/components/features/RichContent';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { encodeThreadId } from '@/lib/thread';
import { formatEventDetailLine, formatRelativeTime } from '@/lib/time';
import type { Discussion } from '@/lib/types';
import { useCheerDiscussion } from '@/lib/useCheerDiscussion';
import { cn } from '@/lib/utils';

type DiscussionCardProps = {
  discussion: Discussion;
  /** Renders at reduced opacity — used for the non-member preview state,
   * where discussions are visible but signal "you're seeing a preview." */
  muted?: boolean;
  /** Gates the Cheer button — only signed-in club members can cheer, not
   * just anyone who can see the (public) preview. */
  isMember?: boolean;
};

export function DiscussionCard({ discussion, muted = false, isMember = false }: DiscussionCardProps) {
  const { hasCheered, cheerCount, toggleCheer } = useCheerDiscussion(discussion);
  const bodyText = discussion.kind === 'event' ? formatEventDetailLine(discussion) : discussion.content;
  const threadHref = `/thread/${encodeThreadId({ kind: 'discussion', clubId: discussion.clubId, discussionId: discussion.id })}`;

  async function handleCheerClick(): Promise<void> {
    try {
      await toggleCheer();
    } catch (error) {
      console.error('Failed to cheer:', error);
      toast.error('Could not send that cheer. Try again.');
    }
  }

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
        {discussion.kind === 'event' ? (
          bodyText && <p className="text-sm text-oak">{bodyText}</p>
        ) : (
          <RichContent content={bodyText} />
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-oak">
        <Link href={threadHref} className="inline-flex items-center gap-1.5 hover:text-ink">
          <IconMessageCircle className="size-4" aria-hidden="true" />
          {discussion.replyCount} repl{discussion.replyCount === 1 ? 'y' : 'ies'}
        </Link>
        {isMember ? (
          <button
            type="button"
            aria-pressed={hasCheered}
            onClick={() => void handleCheerClick()}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
              hasCheered ? 'font-medium text-deep-fresh' : 'text-oak hover:text-ink'
            )}
          >
            <IconHandStop className="size-4" aria-hidden="true" />
            {cheerCount} cheer{cheerCount === 1 ? '' : 's'}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <IconHandStop className="size-4" aria-hidden="true" />
            {cheerCount} cheers
          </span>
        )}
      </div>
    </Card>
  );
}
