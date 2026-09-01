'use client';

import { IconUserPlus } from '@tabler/icons-react';
import { toast } from 'sonner';

type ProjectTeamListProps = {
  ownerName: string;
  collaboratorNames: string[];
};

async function copyInviteLink(): Promise<void> {
  await navigator.clipboard.writeText(window.location.href);
  toast.success('Invite link copied!');
}

// Member-visible (owner + collaborators), not shown to viewers — Piece 3's
// sidebar has "Related" in this slot instead.
export function ProjectTeamList({ ownerName, collaboratorNames }: ProjectTeamListProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-ink">Team</h2>
      <ul className="flex flex-col gap-1">
        <li className="text-sm text-oak">{ownerName} · owner</li>
        {collaboratorNames.map((name, index) => (
          // Index in the key, not just name: this list is names only, no
          // uids (see ProjectTeamListProps) — two collaborators who never
          // set a displayName both fall back to getUserInfo's "Someone",
          // which made key={name} collide and threw a duplicate-key error.
          <li key={`${name}-${index}`} className="text-sm text-oak">
            {name} · collaborator
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => void copyInviteLink()}
        className="inline-flex items-center gap-1.5 self-start text-sm text-deep-fresh hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
      >
        <IconUserPlus className="size-4" aria-hidden="true" />
        Invite
      </button>
    </div>
  );
}
