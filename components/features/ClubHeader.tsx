'use client';

import { IconDotsVertical, IconShare, IconShieldCheck } from '@tabler/icons-react';
import { arrayRemove, doc, increment, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { toast } from 'sonner';

import { ClubBadge } from '@/components/features/ClubBadge';
import { ReportButton } from '@/components/features/ReportButton';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { db } from '@/lib/firebase';
import { formatClubActivity } from '@/lib/time';
import type { Club } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

type ClubHeaderProps = {
  club: Club;
  isMember: boolean;
  lastDiscussionAt?: number;
  onJoin: () => void;
  isJoining: boolean;
  onLeft: () => void;
};

async function copyClubLink(message: string): Promise<void> {
  const url = window.location.href;
  if (navigator.share) {
    await navigator.share({ title: document.title, url }).catch(() => undefined);
    return;
  }
  await navigator.clipboard.writeText(url);
  toast.success(message);
}

export function ClubHeader({ club, isMember, lastDiscussionAt, onJoin, isJoining, onLeft }: ClubHeaderProps) {
  const { user } = useAuth();

  async function handleLeave(): Promise<void> {
    if (!user) return;
    await updateDoc(doc(db, 'clubs', club.id), {
      memberUids: arrayRemove(user.uid),
      memberCount: increment(-1),
    });
    onLeft();
  }

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-sand">
        <Link href="/clubs" className="hover:text-ink">
          Clubs
        </Link>
        <span aria-hidden="true">›</span>
        <Link href="/clubs" className="hover:text-ink">
          {isMember ? 'Yours' : 'Discover'}
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-ink">{club.name}</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <ClubBadge iconName={club.iconName} colorName={club.colorName} size="lg" />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {club.tags.map((tag) => (
                <Chip key={tag} label={tag} />
              ))}
              {club.schoolName ? (
                <Chip label={club.schoolName} color="lilac" />
              ) : (
                <Chip label={club.scope === 'online' ? 'Online' : 'Hybrid'} color="lilac" />
              )}
              {club.advisorUid && (
                <span className="inline-flex items-center gap-1 rounded-pill border border-olive px-3 py-1 text-xs font-medium text-oak">
                  <IconShieldCheck className="size-3.5 text-deep-fresh" aria-hidden="true" />
                  Educator-led
                </span>
              )}
            </div>
            <h1 className="text-[22px] font-medium text-ink">{club.name}</h1>
            <p className="max-w-xl text-sm text-oak">{club.description}</p>
            <p className="text-sm text-sand">
              {club.memberCount} members · {formatClubActivity(lastDiscussionAt)}
              {club.advisorName && ` · advised by ${club.advisorName}`}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void copyClubLink('Link copied!')}
          >
            <IconShare className="size-4" aria-hidden="true" />
            Share
          </Button>

          {isMember ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="icon-sm" aria-label="More options">
                    <IconDotsVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <ConfirmDialog
                    trigger={<DropdownMenuItem onSelect={(event) => event.preventDefault()}>Leave club</DropdownMenuItem>}
                    title="Leave this club?"
                    description="You can rejoin any time, but you'll lose access to member-only discussions until you do."
                    confirmLabel="Leave club"
                    onConfirm={handleLeave}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" onClick={() => void copyClubLink('Invite link copied!')}>
                Invite friends
              </Button>
            </>
          ) : (
            <>
              <ReportButton kind="club" sourceRef={club.id} label="club" />
              <Button type="button" disabled={isJoining} onClick={onJoin}>
                {isJoining ? 'Joining…' : '+ Join club'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
