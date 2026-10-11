'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
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
  /** When set (your own Following list), each row gets an Unfollow button;
   * the person drops off the list once it succeeds. */
  onUnfollow?: (uid: string) => Promise<void>;
};

export function FollowListDialog({ title, trigger, fetchList, onUnfollow }: FollowListDialogProps) {
  const [people, setPeople] = useState<UserInfo[] | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  async function handleUnfollow(person: UserInfo): Promise<void> {
    if (!onUnfollow) return;
    setBusyUid(person.uid);
    try {
      await onUnfollow(person.uid);
      setPeople((previous) => previous?.filter((item) => item.uid !== person.uid) ?? previous);
      toast.success(`Unfollowed ${formatShortName(person.name)}.`);
    } catch (error) {
      console.error('Failed to unfollow:', error);
      toast.error('Could not unfollow. Try again.');
    } finally {
      setBusyUid(null);
    }
  }

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
              <div key={person.uid} className="flex items-center gap-2">
                <Link
                  href={`/profile/${person.uid}`}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] p-1.5 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
                >
                  <Avatar name={person.name} photoURL={person.photoURL} size="sm" decorative />
                  <span className="truncate text-sm font-medium text-ink">{formatShortName(person.name)}</span>
                </Link>
                {onUnfollow && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyUid === person.uid}
                    onClick={() => void handleUnfollow(person)}
                    aria-label={`Unfollow ${formatShortName(person.name)}`}
                  >
                    {busyUid === person.uid ? 'Unfollowing…' : 'Unfollow'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
