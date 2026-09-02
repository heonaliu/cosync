'use client';

import { IconUserPlus } from '@tabler/icons-react';
import Link from 'next/link';

import { InviteDialog } from '@/components/features/InviteDialog';
import type { UserInfo } from '@/lib/queries';

type ProjectTeamListProps = {
  projectId: string;
  projectTitle: string;
  ownerUid: string;
  ownerName: string;
  collaborators: UserInfo[];
  /** Gates the Invite button — sending an invite is an owner-only write
   * (see firestore.rules' projects/{id}/invites create rule), so a
   * non-owner collaborator never sees an affordance that would just fail. */
  isOwner: boolean;
};

// Member-visible (owner + collaborators), not shown to viewers — Piece 3's
// sidebar has "Related" in this slot instead.
export function ProjectTeamList({ projectId, projectTitle, ownerUid, ownerName, collaborators, isOwner }: ProjectTeamListProps) {
  const existingMemberUids = [ownerUid, ...collaborators.map((person) => person.uid)];

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-ink">Team</h2>
      <ul className="flex flex-col gap-1">
        <li className="text-sm text-oak">
          <Link href={`/profile/${ownerUid}`} className="text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh">
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
            · collaborator
          </li>
        ))}
      </ul>
      {isOwner && (
        <InviteDialog
          projectId={projectId}
          projectTitle={projectTitle}
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
