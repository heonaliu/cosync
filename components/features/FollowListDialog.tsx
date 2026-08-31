'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatShortName } from '@/lib/profile';
import type { UserInfo } from '@/lib/queries';

type FollowListDialogProps = {
  title: string;
  trigger: React.ReactNode;
  /** Lazy — only fetched the first time the dialog actually opens, since a
   * viewer who never opens the follower/following list shouldn't pay for
   * resolving every uid in it. */
  fetchList: () => Promise<UserInfo[]>;
};

export function FollowListDialog({ title, trigger, fetchList }: FollowListDialogProps) {
  const [people, setPeople] = useState<UserInfo[] | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  function handleOpenChange(open: boolean): void {
    if (open && !hasLoaded) {
      setHasLoaded(true);
      fetchList()
        .then(setPeople)
        .catch((error: unknown) => {
          console.error('Failed to load list:', error);
          setPeople([]);
        });
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[70vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {people === null && <p className="text-sm text-sand">Loading…</p>}
        {people?.length === 0 && <p className="text-sm text-oak">Nobody here yet.</p>}

        {people && people.length > 0 && (
          <div className="flex flex-col gap-1">
            {people.map((person) => (
              <Link
                key={person.uid}
                href={`/profile/${person.uid}`}
                className="flex items-center gap-2.5 rounded-[10px] p-1.5 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
              >
                <Avatar name={person.name} photoURL={person.photoURL} size="sm" decorative />
                <span className="text-sm font-medium text-ink">{formatShortName(person.name)}</span>
              </Link>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
