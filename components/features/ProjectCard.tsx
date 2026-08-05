import { IconSparkles } from '@tabler/icons-react';
import Link from 'next/link';

import { LookingForCallout } from '@/components/features/LookingForCallout';
import { Chip } from '@/components/ui/Chip';
import type { Project } from '@/lib/types';

type ProjectCardProps = {
  project: Project;
  /** 'feed' shows every tag plus collaborator count and a "looking for" pill;
   * 'compact' (the landing page's "Recent projects" cards, and Discover)
   * shows one tag only. */
  variant?: 'compact' | 'feed';
  recommendationReason?: string;
  /** Shows a "X people · Y entries" line under the description — used by
   * Discover, omitted everywhere else since it's a separate aggregation
   * query per card, not a field the caller always has on hand. */
  entryCount?: number;
};

export function ProjectCard({
  project,
  variant = 'compact',
  recommendationReason,
  entryCount,
}: ProjectCardProps) {
  const visibleTags = variant === 'feed' ? project.tags : project.tags.slice(0, 1);
  const collaboratorCount = project.memberUids.length;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex flex-col gap-3 rounded-card bg-white p-5 transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
    >
      {recommendationReason && (
        <div className="flex items-center gap-1.5 text-xs text-sand">
          <IconSparkles className="size-3.5 text-deep-fresh" aria-hidden="true" />
          <span>Recommended · {recommendationReason}</span>
        </div>
      )}

      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visibleTags.map((tag) => (
            <Chip key={tag} label={tag} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-ink">{project.title}</h3>
        <p className="text-sm text-oak">{project.description || project.pitch}</p>
      </div>

      {variant === 'compact' && entryCount !== undefined && (
        <p className="text-xs text-sand">
          {collaboratorCount} {collaboratorCount === 1 ? 'person' : 'people'} · {entryCount}{' '}
          {entryCount === 1 ? 'entry' : 'entries'}
        </p>
      )}

      {variant === 'feed' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <span className="whitespace-nowrap text-sm text-oak">
            {collaboratorCount} collaborator{collaboratorCount === 1 ? '' : 's'}
          </span>
          {project.lookingFor && <LookingForCallout role={project.lookingFor.role} />}
        </div>
      )}
    </Link>
  );
}
