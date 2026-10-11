'use client';

import { IconDotsVertical, IconLock, IconShare, IconWorld } from '@tabler/icons-react';
import { arrayRemove, deleteDoc, doc, increment, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { ClubBadge } from '@/components/features/ClubBadge';
import { ClubJoinCodeDialog } from '@/components/features/ClubJoinCodeDialog';
import { EditClubDialog } from '@/components/features/EditClubDialog';
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
import { ExpandableText } from '@/components/ui/ExpandableText';
import { clubScopeLabel } from '@/lib/clubScopes';
import { buildClubInviteUrl, getOrCreateClubInviteCode } from '@/lib/clubInvites';
import { db } from '@/lib/firebase';
import { formatClubActivity } from '@/lib/time';
import type { Club } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { toExternalHref } from '@/lib/utils';

type ClubHeaderProps = {
  club: Club;
  isMember: boolean;
  isAdmin: boolean;
  /** False for an invite-only club opened without a valid ?invite= link. */
  canJoin: boolean;
  lastDiscussionAt?: number;
  onJoin: () => void;
  isJoining: boolean;
  onLeft: () => void;
  onClubChanged: () => void;
};

async function copyClubLink(message: string, url = window.location.href): Promise<void> {
  if (navigator.share) {
    await navigator.share({ title: document.title, url }).catch(() => undefined);
    return;
  }
  await navigator.clipboard.writeText(url);
  toast.success(message);
}

export function ClubHeader({ club, isMember, isAdmin, canJoin, lastDiscussionAt, onJoin, isJoining, onLeft, onClubChanged }: ClubHeaderProps) {
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [joinCodeOpen, setJoinCodeOpen] = useState(false);
  const isInviteOnly = club.access === 'invite';

  // An invite-only club's page URL alone won't let anyone in — the link has
  // to carry the club's secret code, which only admins can read.
  async function handleCopyInviteLink(): Promise<void> {
    try {
      const code = await getOrCreateClubInviteCode(club.id);
      await copyClubLink('Invite link copied!', buildClubInviteUrl(club.id, code));
    } catch (error) {
      console.error('Failed to create invite link:', error);
      toast.error('Could not create an invite link. Try again.');
    }
  }

  // The last person out takes the club with them — an empty club has no
  // one to run it and would just clutter Discover.
  const isLastMember = Boolean(user) && club.memberUids.length === 1 && club.memberUids[0] === user?.uid;

  async function handleLeave(): Promise<void> {
    if (!user) return;
    if (isLastMember) {
      await deleteDoc(doc(db, 'clubs', club.id));
      toast.success('You were the last member, so the club was deleted.');
      onLeft();
      return;
    }
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
              <Chip label={clubScopeLabel(club)} color="lilac" />
              {club.schoolName && <Chip label={club.schoolName} color="lilac" />}
              {isInviteOnly && (
                <span className="inline-flex items-center gap-1 rounded-pill border border-olive px-3 py-1 text-xs font-medium text-oak">
                  <IconLock className="size-3.5" aria-hidden="true" />
                  Invite only
                </span>
              )}
            </div>
            <h1 className="text-[22px] font-medium text-ink">{club.name}</h1>
            <ExpandableText text={club.description} className="max-w-xl" />
            {club.websiteUrl && (
              <a
                href={toExternalHref(club.websiteUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 self-start rounded-pill text-sm text-deep-fresh hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
              >
                <IconWorld className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{club.websiteUrl.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            <p className="text-sm text-sand">
              {club.memberCount} members · {formatClubActivity(lastDiscussionAt)}
              {club.advisorName && ` · advised by ${club.advisorName}`}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isInviteOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copyClubLink('Link copied!')}
            >
              <IconShare className="size-4" aria-hidden="true" />
              Share
            </Button>
          )}

          {isMember ? (
            <>
              {/* modal={false}: otherwise opening "Edit club" from the menu can
                  leave the page unclickable after the dialog closes. */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="icon-sm" aria-label="More options">
                    <IconDotsVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin && <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit club</DropdownMenuItem>}
                  {isAdmin && club.access !== 'anyone' && (
                    <DropdownMenuItem onSelect={() => setJoinCodeOpen(true)}>Join code</DropdownMenuItem>
                  )}
                  <ConfirmDialog
                    trigger={<DropdownMenuItem onSelect={(event) => event.preventDefault()}>Leave club</DropdownMenuItem>}
                    title={isLastMember ? 'Leave and delete this club?' : 'Leave this club?'}
                    description={
                      isLastMember
                        ? "You're the only member left, so leaving will permanently delete the club and its discussions."
                        : "You can rejoin any time, but you'll lose access to member-only discussions until you do."
                    }
                    confirmLabel={isLastMember ? 'Leave and delete' : 'Leave club'}
                    onConfirm={handleLeave}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
              {isInviteOnly ? (
                isAdmin && (
                  <Button type="button" onClick={() => void handleCopyInviteLink()}>
                    Copy invite link
                  </Button>
                )
              ) : (
                <Button type="button" onClick={() => void copyClubLink('Invite link copied!')}>
                  Invite friends
                </Button>
              )}
            </>
          ) : (
            <>
              <ReportButton kind="club" sourceRef={club.id} label="club" />
              {canJoin && (
                <Button type="button" disabled={isJoining} onClick={onJoin}>
                  {isJoining ? 'Joining…' : '+ Join club'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {isAdmin && <EditClubDialog club={club} open={editOpen} onOpenChange={setEditOpen} onSaved={onClubChanged} />}
      {isAdmin && <ClubJoinCodeDialog club={club} open={joinCodeOpen} onOpenChange={setJoinCodeOpen} />}
    </div>
  );
}
