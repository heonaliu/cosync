import Link from 'next/link';

import { AvatarStack } from '@/components/ui/AvatarStack';
import { Chip } from '@/components/ui/Chip';
import { STAGE_LABELS, stageColorFor } from '@/lib/color';
import { formatRelativeTime } from '@/lib/time';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';

type MyProjectCardProps = {
  project: Project;
} & (
  | {
      /** "Owned by you" card — draft projects render with reduced content
       * (dashed border, no avatar/entries row, no latest strip) since
       * there's nothing to show yet. */
      kind: 'owned';
      memberPreviewNames: string[];
      entryCount: number;
      latestEntryPreview?: string;
    }
  | {
      /** "Contributing to" card — shows who owns it instead of activity,
       * since a collaborator's own recent-activity stats aren't the point
       * here the way they are on your own projects. */
      kind: 'contributing';
      ownerName: string;
    }
);

export function MyProjectCard(props: MyProjectCardProps) {
  const { project } = props;
  const isDraft = props.kind === 'owned' && project.visibility === 'draft';

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'flex flex-col gap-3 rounded-card bg-white p-5 transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
        isDraft && 'border border-dashed border-olive shadow-none hover:shadow-none'
      )}
    >
      <div className="flex flex-wrap gap-2">
        {project.tags[0] && <Chip label={project.tags[0]} />}
        {isDraft ? (
          <span className="inline-flex items-center rounded-pill border border-olive px-3 py-1 text-xs font-medium text-sand">
            Draft
          </span>
        ) : (
          <Chip label={STAGE_LABELS[project.stage]} color={stageColorFor(project.stage)} />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-ink">{project.title}</h3>
        <p className="text-sm text-oak">{project.pitch}</p>
      </div>

      {props.kind === 'owned' &&
        (isDraft ? (
          <p className="text-xs text-sand">Draft · not published</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <AvatarStack names={props.memberPreviewNames} size="sm" />
              <span className="text-xs text-sand">
                {props.entryCount} {props.entryCount === 1 ? 'entry' : 'entries'} · updated{' '}
                {formatRelativeTime(project.updatedAt)}
              </span>
            </div>
            {props.latestEntryPreview && (
              <p className="truncate rounded-card bg-cream px-3 py-2 text-xs text-oak">
                Latest: {props.latestEntryPreview}
              </p>
            )}
          </>
        ))}

      {props.kind === 'contributing' && (
        <p className="text-xs text-sand">Owner: {props.ownerName} · you&apos;re a collaborator</p>
      )}
    </Link>
  );
}
