'use client';

import { IconLink, IconPencil } from '@tabler/icons-react';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';

import { EditLinksDialog } from '@/components/features/EditLinksDialog';
import { ProjectInterestedList } from '@/components/features/ProjectInterestedList';
import { ProjectLookingForCard } from '@/components/features/ProjectLookingForCard';
import { ProjectTeamList } from '@/components/features/ProjectTeamList';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import type { UserInfo } from '@/lib/queries';
import { formatRelativeTime } from '@/lib/time';
import type { JoinRequest, Project } from '@/lib/types';
import { toExternalHref } from '@/lib/utils';

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
  isManager: boolean;
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
  isManager,
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
          project={project}
          ownerName={ownerName}
          collaborators={collaborators}
          isManager={isManager}
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
              title="Links"
              description="Repo, demo video, bill of materials — whatever's worth linking to."
              initialLinks={project.links ?? []}
              onSave={async (links) => {
                await updateDoc(doc(db, 'projects', project.id), {
                  links: links.length > 0 ? links : deleteField(),
                });
                onProjectChanged();
              }}
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
                <a
                  href={toExternalHref(link.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-pill text-sm text-deep-fresh hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
                >
                  <IconLink className="size-4" aria-hidden="true" />
                  {link.label}
                </a>
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
