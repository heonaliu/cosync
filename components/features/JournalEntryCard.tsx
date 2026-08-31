'use client';

import { IconHandStop, IconMessageCircle, IconPaperclip } from '@tabler/icons-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { RichContent } from '@/components/features/RichContent';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { encodeThreadId } from '@/lib/thread';
import { formatRelativeTime } from '@/lib/time';
import type { JournalEntry } from '@/lib/types';
import { useCheerJournalEntry } from '@/lib/useCheerJournalEntry';
import { cn } from '@/lib/utils';

type JournalEntryCardProps = {
  entry: JournalEntry;
  /** False when the current viewer is this project's owner — this product's
   * rule is that the person running their own project's build journal
   * doesn't cheer/comment on their own log, so the whole journal renders
   * counts-only for them regardless of which collaborator wrote which
   * entry. True for a collaborator or a viewer, on every entry. See
   * ProjectDetail for where this is computed. */
  showButtons: boolean;
};

export function JournalEntryCard({ entry, showButtons }: JournalEntryCardProps) {
  const { hasCheered, cheerCount, toggleCheer } = useCheerJournalEntry(entry);
  const threadHref = `/thread/${encodeThreadId({ kind: 'journal', projectId: entry.projectId, entryId: entry.id })}`;

  async function handleCheerClick(): Promise<void> {
    try {
      await toggleCheer();
    } catch (error) {
      console.error('Failed to cheer:', error);
      toast.error('Could not send that cheer. Try again.');
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Link href={`/profile/${entry.authorUid}`} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh">
          <Avatar name={entry.authorName} size="sm" decorative />
        </Link>
        <Link href={`/profile/${entry.authorUid}`} className="text-sm font-medium text-ink hover:underline">
          {entry.authorName}
        </Link>
        <span className="text-xs text-sand">{formatRelativeTime(entry.createdAt)}</span>
      </div>

      <RichContent content={entry.content} />

      {entry.mediaUrls && entry.mediaUrls.length > 0 && (
        <div className="flex items-center gap-2 rounded-card border border-olive bg-cream px-3 py-2 text-xs text-oak">
          <IconPaperclip className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{entry.mediaUrls.join(' · ')}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        {showButtons && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={hasCheered}
              onClick={() => void handleCheerClick()}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
                hasCheered ? 'border-fresh bg-sage font-medium text-deep-fresh' : 'border-olive bg-white text-oak hover:bg-cream'
              )}
            >
              <IconHandStop className="size-4" aria-hidden="true" />
              Cheer
            </button>
            <Link
              href={threadHref}
              className="inline-flex items-center gap-1.5 rounded-pill border border-olive bg-white px-3 py-1 text-sm text-oak transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
            >
              <IconMessageCircle className="size-4" aria-hidden="true" />
              Comment
            </Link>
          </div>
        )}

        <Link href={threadHref} className="inline-flex items-center gap-3 text-sm text-oak hover:text-ink">
          <span className="inline-flex items-center gap-1.5">
            <IconMessageCircle className="size-4" aria-hidden="true" />
            {entry.commentCount} comment{entry.commentCount === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconHandStop className="size-4" aria-hidden="true" />
            {cheerCount} cheer{cheerCount === 1 ? '' : 's'}
          </span>
        </Link>
      </div>
    </Card>
  );
}
