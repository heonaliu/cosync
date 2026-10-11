'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatShortName } from '@/lib/profile';
import { getUserInfo, type UserInfo } from '@/lib/queries';
import type { Club } from '@/lib/types';

type ClubMembersDialogProps = {
  club: Club;
  trigger: ReactNode;
};

// Read-only roster, same shape as ProjectTeamModal minus the role
// controls. Profiles are only fetched once the dialog is first opened —
// a big club's sidebar shouldn't load every member up front.
export function ClubMembersDialog({ club, trigger }: ClubMembersDialogProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<UserInfo[] | null>(null);

  useEffect(() => {
    if (!open || members) return;
    let cancelled = false;
    Promise.all(club.memberUids.map((uid) => getUserInfo(uid)))
      .then((people) => {
        if (cancelled) return;
        // Admins first, then everyone else alphabetically.
        const isAdmin = (uid: string) => club.adminUids.includes(uid);
        setMembers(
          people.sort((a, b) => Number(isAdmin(b.uid)) - Number(isAdmin(a.uid)) || a.name.localeCompare(b.name))
        );
      })
      .catch((error: unknown) => {
        console.error('Failed to load club members:', error);
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, members, club.memberUids, club.adminUids]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Members ({club.memberUids.length})</DialogTitle>
          <DialogDescription>Everyone in {club.name}.</DialogDescription>
        </DialogHeader>

        {members === null ? (
          <p className="text-sm text-sand">Loading members…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-sand">Could not load members. Try again.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {members.map((person) => {
              const shortName = formatShortName(person.name);
              return (
                <li key={person.uid} className="flex items-center gap-3">
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
                    {shortName}
                  </Link>
                  {club.adminUids.includes(person.uid) && <span className="text-xs text-sand">Admin</span>}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
