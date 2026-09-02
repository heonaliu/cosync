'use client';

import { IconUserPlus } from '@tabler/icons-react';
import Link from 'next/link';

import { InviteDialog } from '@/components/features/InviteDialog';
import { getMemberRole } from '@/lib/projectRoles';
import type { UserInfo } from '@/lib/queries';
import type { Project } from '@/lib/types';

const ROLE_LABELS = { coOwner: 'co-owner', collaborator: 'collaborator' } as const;

type ProjectTeamListProps = {
  project: Project;
  ownerName: string;
  collaborators: UserInfo[];
  /** Gates the Invite button — sending an invite is an owner/co-owner-only
   * write (see firestore.rules' projects/{id}/invites create rule). */
  isManager: boolean;
};

// Member-visible (owner + collaborators), not shown to viewers — Piece 3's
// sidebar has "Related" in this slot instead. Full role management (change
// role, remove someone) lives in ProjectTeamModal, opened from the avatar
// circles in ProjectHeader — this is the glanceable summary + quick invite.
export function ProjectTeamList({ project, ownerName, collaborators, isManager }: ProjectTeamListProps) {
  const existingMemberUids = [project.ownerUid, ...collaborators.map((person) => person.uid)];

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-ink">Team</h2>
      <ul className="flex flex-col gap-1">
        <li className="text-sm text-oak">
          <Link href={`/profile/${project.ownerUid}`} className="text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh">
            {ownerName}
          </Link>{' '}
          · owner
        </li>
        {collaborators.map((person) => (
          <li key={person.uid} className="text-sm text-oak">
            <Link
              href={`/profile/${person.uid}`}
              className="text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
            >
              {person.name}
            </Link>{' '}
            · {ROLE_LABELS[getMemberRole(project, person.uid) as 'coOwner' | 'collaborator']}
          </li>
        ))}
      </ul>
      {isManager && (
        <InviteDialog
          projectId={project.id}
          projectTitle={project.title}
          existingMemberUids={existingMemberUids}
          trigger={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 self-start text-sm text-deep-fresh hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
            >
              <IconUserPlus className="size-4" aria-hidden="true" />
              Invite
            </button>
          }
        />
      )}
    </div>
  );
}
