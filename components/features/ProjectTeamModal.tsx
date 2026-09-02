'use client';

import { IconX } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PillToggle } from '@/components/ui/PillToggle';
import { getMemberRole, removeProjectMember, setProjectMemberRole } from '@/lib/projectRoles';
import type { UserInfo } from '@/lib/queries';
import type { Project, ProjectMemberRole } from '@/lib/types';

type ProjectTeamModalProps = {
  project: Project;
  ownerName: string;
  ownerPhotoURL: string | null;
  collaborators: UserInfo[];
  /** Owner or co-owner — can change roles and remove people. See
   * lib/projectRoles.ts. */
  isManager: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

export function ProjectTeamModal({
  project,
  ownerName,
  ownerPhotoURL,
  collaborators,
  isManager,
  open,
  onOpenChange,
  onChanged,
}: ProjectTeamModalProps) {
  const [busyUid, setBusyUid] = useState<string | null>(null);

  async function handleRoleChange(uid: string, role: ProjectMemberRole): Promise<void> {
    setBusyUid(uid);
    try {
      await setProjectMemberRole(project.id, uid, role);
      onChanged();
    } catch (error) {
      console.error('Failed to change role:', error);
      toast.error('Could not change that role. Try again.');
    } finally {
      setBusyUid(null);
    }
  }

  async function handleRemove(uid: string): Promise<void> {
    setBusyUid(uid);
    try {
      await removeProjectMember(project.id, uid);
      onChanged();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Could not remove that person. Try again.');
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Who&apos;s working on this</DialogTitle>
          <DialogDescription>
            {isManager
              ? 'Collaborators can post and edit their own updates. Co-owners can also invite/remove people and delete any post.'
              : 'The team behind this project.'}
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-3">
          <li className="flex items-center gap-3">
            <Link
              href={`/profile/${project.ownerUid}`}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
            >
              <Avatar name={ownerName} photoURL={ownerPhotoURL} size="sm" decorative />
            </Link>
            <Link href={`/profile/${project.ownerUid}`} className="flex-1 truncate text-sm font-medium text-ink hover:underline">
              {ownerName}
            </Link>
            <span className="text-xs text-sand">Owner</span>
          </li>

          {collaborators.map((person) => {
            const role = getMemberRole(project, person.uid);
            const isBusy = busyUid === person.uid;
            return (
              <li key={person.uid} className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/profile/${person.uid}`}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
                >
                  <Avatar name={person.name} photoURL={person.photoURL} size="sm" decorative />
                </Link>
                <Link
                  href={`/profile/${person.uid}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:underline"
                >
                  {person.name}
                </Link>

                {isManager ? (
                  <div className="flex items-center gap-1.5">
                    <PillToggle
                      label="Collaborator"
                      isActive={role === 'collaborator'}
                      onClick={() => void handleRoleChange(person.uid, 'collaborator')}
                    />
                    <PillToggle
                      label="Co-owner"
                      isActive={role === 'coOwner'}
                      activeColor="purple"
                      onClick={() => void handleRoleChange(person.uid, 'coOwner')}
                    />
                    <ConfirmDialog
                      trigger={
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${person.name}`} disabled={isBusy}>
                          <IconX className="size-4 text-sand" />
                        </Button>
                      }
                      title={`Remove ${person.name}?`}
                      description="They'll lose their collaborator access to this project right away."
                      confirmLabel="Remove"
                      onConfirm={() => handleRemove(person.uid)}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-sand">{role === 'coOwner' ? 'Co-owner' : 'Collaborator'}</span>
                )}
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
