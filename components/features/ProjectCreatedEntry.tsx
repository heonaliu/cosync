import { IconSparkles } from '@tabler/icons-react';
import Link from 'next/link';

import { formatRelativeTime } from '@/lib/time';
import type { Project } from '@/lib/types';

type ProjectCreatedEntryProps = {
  project: Project;
  ownerName: string;
};

// The build journal's first entry: "Heona created TrashTracker · 3 days ago".
// Derived from the project's own ownerUid/createdAt at render time rather
// than written as a real journalEntries doc, so it exists for every project
// (including ones made before this did), can't be deleted or cheered, and
// never counts toward entry totals or shows up in Home's feed.
export function ProjectCreatedEntry({ project, ownerName }: ProjectCreatedEntryProps) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-dashed border-olive p-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage text-deep-fresh">
        <IconSparkles className="size-4" aria-hidden="true" />
      </span>
      <p className="text-sm text-oak">
        <Link href={`/profile/${project.ownerUid}`} className="font-medium text-ink hover:underline">
          {ownerName || 'Someone'}
        </Link>{' '}
        created <span className="font-medium text-ink">{project.title}</span>
        <span className="text-sand"> · {formatRelativeTime(project.createdAt)}</span>
      </p>
    </div>
  );
}
