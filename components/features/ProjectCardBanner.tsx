import { COVER_ASPECT_CLASS, ProjectCover } from '@/components/features/ProjectCover';
import { accentClasses, accentColorFor } from '@/lib/color';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';

// The strip across the top of every project card: the cover photo when
// there is one, otherwise a band in the project's first tag's color (the
// same color as its tag chip). Same height either way, so a grid mixing
// both stays even. Bleeds to the card's edges — cards use p-5.
export function ProjectCardBanner({ project }: { project: Pick<Project, 'coverImageUrl' | 'coverPosition' | 'tags' | 'id'> }) {
  const bleed = '-mx-5 -mt-5 mb-1 w-[calc(100%+2.5rem)] max-w-none';
  if (project.coverImageUrl) {
    return <ProjectCover url={project.coverImageUrl} variant="card" position={project.coverPosition} className={bleed} />;
  }
  const { bg } = accentClasses(accentColorFor(project.tags.find(Boolean) ?? project.id));
  return <div aria-hidden="true" className={cn(COVER_ASPECT_CLASS, bg, bleed)} />;
}
