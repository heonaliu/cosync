'use client';

import { IconHandStop, IconMessageCircle, IconShieldCheck, IconTrash } from '@tabler/icons-react';
import { deleteDoc, doc } from 'firebase/firestore';
import Link from 'next/link';
import { toast } from 'sonner';

import { ReportButton } from '@/components/features/ReportButton';
import { RichContent } from '@/components/features/RichContent';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { db } from '@/lib/firebase';
import { encodeThreadId } from '@/lib/thread';
import { formatEventDetailLine, formatRelativeTime } from '@/lib/time';
import type { Discussion } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { useCheerDiscussion } from '@/lib/useCheerDiscussion';
import { cn, truncateText } from '@/lib/utils';

type DiscussionCardProps = {
  discussion: Discussion;
  /** Renders at reduced opacity — used for the non-member preview state,
   * where discussions are visible but signal "you're seeing a preview." */
  muted?: boolean;
  /** Gates the Cheer button — only signed-in club members can cheer, not
   * just anyone who can see the (public) preview. */
  isMember?: boolean;
  /** Called after the author deletes this post, so the list can refresh. */
  onDeleted?: () => void;
};

export function DiscussionCard({ discussion, muted = false, isMember = false, onDeleted }: DiscussionCardProps) {
  const { user } = useAuth();
  const { hasCheered, cheerCount, toggleCheer } = useCheerDiscussion(discussion);
  const isAuthor = Boolean(user) && user?.uid === discussion.authorUid;
  // Some older event posts have no date/place — show what they do have
  // (their text) rather than an empty card.
  const bodyText =
    discussion.kind === 'event' ? formatEventDetailLine(discussion) || discussion.content : discussion.content;
  const threadHref = `/thread/${encodeThreadId({ kind: 'discussion', clubId: discussion.clubId, discussionId: discussion.id })}`;

  // Replies stay behind in Firestore but nothing links to them any more —
  // same as deleting an event from ClubEventCard.
  async function handleDelete(): Promise<void> {
    try {
      await deleteDoc(doc(db, 'clubs', discussion.clubId, 'discussions', discussion.id));
      onDeleted?.();
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Could not delete that post. Try again.');
    }
  }

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
        <div className="flex items-center gap-1">
          {discussion.kind !== 'discussion' && (
            <Chip
              label={discussion.kind === 'announcement' ? 'Announcement' : 'Event'}
              color="sage"
            />
          )}
          {isAuthor ? (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete post">
                  <IconTrash className="size-4 text-sand" />
                </Button>
              }
              title={discussion.kind === 'event' ? 'Delete this event?' : 'Delete this post?'}
              description="This can't be undone."
              confirmLabel="Delete"
              onConfirm={handleDelete}
            />
          ) : (
            user && <ReportButton kind="discussion" sourceRef={`${discussion.clubId}/${discussion.id}`} label="post" />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {discussion.title && <h3 className="text-sm font-medium text-ink">{discussion.title}</h3>}
        {discussion.kind === 'event' ? (
          bodyText && <p className="text-sm text-oak">{truncateText(bodyText)}</p>
        ) : (
          <RichContent content={bodyText} maxLength={150} moreHref={threadHref} />
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
