import { IconHandStop, IconMessageCircle } from '@tabler/icons-react';
import Link from 'next/link';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { formatRelativeTime } from '@/lib/time';
import type { JournalEntry as JournalEntryData } from '@/lib/types';

type JournalEntryProps = {
  entry: JournalEntryData;
};

export function JournalEntry({ entry }: JournalEntryProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Link href={`/profile/${entry.authorUid}`} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh">
          <Avatar name={entry.authorName} decorative />
        </Link>
        <div className="flex flex-col">
          <p className="text-sm text-ink">
            <Link href={`/profile/${entry.authorUid}`} className="font-medium hover:underline">
              {entry.authorName}
            </Link>{' '}
            posted to{' '}
            <Link href={`/projects/${entry.projectId}`} className="font-medium text-purple hover:underline">
              {entry.projectTitle}
            </Link>
          </p>
          <span className="text-xs text-sand">{formatRelativeTime(entry.createdAt)}</span>
        </div>
      </div>

      <p className="text-sm text-ink">{entry.content}</p>

      <div className="flex items-center gap-4 text-sm text-oak">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-pill hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
        >
          <IconHandStop className="size-4" aria-hidden="true" />
          Cheer
        </button>
        <span className="inline-flex items-center gap-1.5">
          <IconMessageCircle className="size-4" aria-hidden="true" />
          {entry.commentCount} comment{entry.commentCount === 1 ? '' : 's'}
        </span>
      </div>
    </Card>
  );
}
