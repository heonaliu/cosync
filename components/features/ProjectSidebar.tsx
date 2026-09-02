'use client';

import { IconLink, IconPencil } from '@tabler/icons-react';
import Link from 'next/link';

import { EditLinksDialog } from '@/components/features/EditLinksDialog';
import { ProjectInterestedList } from '@/components/features/ProjectInterestedList';
import { ProjectLookingForCard } from '@/components/features/ProjectLookingForCard';
import { ProjectTeamList } from '@/components/features/ProjectTeamList';
import { Button } from '@/components/ui/button';
import type { UserInfo } from '@/lib/queries';
import { formatRelativeTime } from '@/lib/time';
import type { JoinRequest, Project } from '@/lib/types';

const VISIBILITY_LABELS: Record<Project['visibility'], string> = {
  public: 'public',
  unlisted: 'unlisted',
  private: 'private',
};

export type RelatedProjectEntry = { project: Project; ownerName: string };

type ProjectSidebarProps = {
  project: Project;
  isOwner: boolean;
  isMember: boolean;
  ownerName: string;
  collaborators: UserInfo[];
  entryCount: number;
  joinRequests: JoinRequest[];
  relatedProjects: RelatedProjectEntry[];
  onProjectChanged: () => void;
  onJoinRequestResolved: () => void;
};

export function ProjectSidebar({
  project,
  isOwner,
  isMember,
  ownerName,
  collaborators,
  entryCount,
  joinRequests,
  relatedProjects,
  onProjectChanged,
  onJoinRequestResolved,
}: ProjectSidebarProps) {
  const aboutLine = isMember
    ? `${entryCount} ${entryCount === 1 ? 'entry' : 'entries'} · ${VISIBILITY_LABELS[project.visibility]} · started ${formatRelativeTime(project.createdAt)}`
    : `${entryCount} ${entryCount === 1 ? 'entry' : 'entries'} · ${project.memberUids.length} collaborators · ${VISIBILITY_LABELS[project.visibility]} · started ${formatRelativeTime(project.createdAt)}`;

  return (
    <div className="flex flex-col gap-6">
      <ProjectLookingForCard project={project} isOwner={isOwner} isMember={isMember} onProjectChanged={onProjectChanged} />

      {isOwner && <ProjectInterestedList projectId={project.id} requests={joinRequests} onResolved={onJoinRequestResolved} />}

      {isMember && (
        <ProjectTeamList
          projectId={project.id}
          projectTitle={project.title}
          ownerUid={project.ownerUid}
          ownerName={ownerName}
          collaborators={collaborators}
          isOwner={isOwner}
        />
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium text-ink">About</h2>
        <p className="text-sm text-sand">{aboutLine}</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-ink">Links</h2>
          {isOwner && (
            <EditLinksDialog
              project={project}
              onSaved={onProjectChanged}
              trigger={
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit links">
                  <IconPencil className="size-4 text-sand" />
                </Button>
              }
            />
          )}
        </div>
        {project.links && project.links.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {project.links.map((link) => (
              <li key={link.label}>
                <Link href={link.url} className="inline-flex items-center gap-1.5 text-sm text-deep-fresh hover:underline">
                  <IconLink className="size-4" aria-hidden="true" />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          isOwner && <p className="text-sm text-sand">No links yet.</p>
        )}
      </div>

      {!isMember && relatedProjects.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-ink">Related</h2>
          <ul className="flex flex-col gap-3">
            {relatedProjects.map(({ project: related, ownerName: relatedOwnerName }) => (
              <li key={related.id}>
                <Link href={`/projects/${related.id}`} className="flex flex-col hover:underline">
                  <span className="text-sm text-ink">{related.title}</span>
                  <span className="text-xs text-sand">
                    by {relatedOwnerName}
                    {related.tags[0] && ` · ${related.tags[0].toLowerCase()}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
