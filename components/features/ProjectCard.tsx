import { IconSparkles } from '@tabler/icons-react';

import { LookingForCallout } from '@/components/features/LookingForCallout';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import type { Project } from '@/lib/types';

type ProjectCardProps = {
  project: Project;
  /** 'feed' shows every tag plus collaborator count and a "looking for" pill;
   * 'compact' (the landing page's "Recent projects" cards) shows one tag only. */
  variant?: 'compact' | 'feed';
  recommendationReason?: string;
};

export function ProjectCard({ project, variant = 'compact', recommendationReason }: ProjectCardProps) {
  const visibleTags = variant === 'feed' ? project.tags : project.tags.slice(0, 1);
  const collaboratorCount = project.memberUids.length;

  return (
    <Card className="flex flex-col gap-3">
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

      {variant === 'feed' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <span className="whitespace-nowrap text-sm text-oak">
            {collaboratorCount} collaborator{collaboratorCount === 1 ? '' : 's'}
          </span>
          {project.lookingFor && <LookingForCallout role={project.lookingFor.role} />}
        </div>
      )}
    </Card>
  );
}
