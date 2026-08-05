'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ClubAboutCard } from '@/components/features/ClubAboutCard';
import { ClubComposer } from '@/components/features/ClubComposer';
import { ClubDiscussionList } from '@/components/features/ClubDiscussionList';
import { ClubEventCard } from '@/components/features/ClubEventCard';
import { ClubHeader } from '@/components/features/ClubHeader';
import { ClubSidebar } from '@/components/features/ClubSidebar';
import { UpcomingEventsList } from '@/components/features/UpcomingEventsList';
import { getNextEventOccurrence } from '@/lib/time';
import { getClub, getClubDiscussions, getClubMemberPreviews, getRelatedClubs } from '@/lib/queries';
import type { Club, Discussion } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { useJoinClub } from '@/lib/useJoinClub';

type ClubDetailProps = {
  clubId: string;
};

// undefined = still loading, null = doesn't exist / failed to load
export function ClubDetail({ clubId }: ClubDetailProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [club, setClub] = useState<Club | null | undefined>(undefined);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [memberPreviewNames, setMemberPreviewNames] = useState<string[]>([]);
  const [relatedClubs, setRelatedClubs] = useState<Club[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const { join, isJoining } = useJoinClub(clubId);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load(): Promise<void> {
      const fetchedClub = await getClub(clubId);
      if (!fetchedClub) {
        if (!cancelled) setClub(null);
        return;
      }

      const [fetchedDiscussions, previewNames, related] = await Promise.all([
        getClubDiscussions(clubId, fetchedClub),
        getClubMemberPreviews(fetchedClub.memberUids, 5),
        getRelatedClubs(fetchedClub, 2),
      ]);

      if (!cancelled) {
        setClub(fetchedClub);
        setDiscussions(fetchedDiscussions);
        setMemberPreviewNames(previewNames);
        setRelatedClubs(related);
      }
    }

    load().catch((error: unknown) => {
      console.error('Failed to load club:', error);
      if (!cancelled) setClub(null);
    });

    return () => {
      cancelled = true;
    };
  }, [clubId, user, reloadToken]);

  async function handleJoin(): Promise<void> {
    try {
      await join();
      setReloadToken((token) => token + 1);
    } catch (error) {
      console.error('Failed to join club:', error);
      toast.error('Could not join the club. Try again.');
    }
  }

  function handleLeft(): void {
    router.push('/clubs');
  }

  if (club === undefined) {
    return <p className="text-sm text-sand">Loading club…</p>;
  }
  if (club === null) {
    return <p className="text-sm text-oak">This club doesn&apos;t exist or was removed.</p>;
  }

  const isMember = Boolean(user && club.memberUids.includes(user.uid));

  // Every event discussion that still has a next occurrence (one-time
  // events that already happened drop out entirely; recurring ones always
  // have a next occurrence as long as they still have recurringDays set),
  // soonest first. The spotlight card gets the very first one; the rest
  // show in the compact list below it — this is the "see multiple/future
  // events" view, sorted by when they actually happen next, not by post date.
  const upcomingEvents = discussions
    .filter((discussion) => discussion.kind === 'event')
    .map((discussion) => ({ discussion, nextOccurrence: getNextEventOccurrence(discussion) }))
    .filter(
      (entry): entry is { discussion: Discussion; nextOccurrence: number } => entry.nextOccurrence !== undefined
    )
    .sort((a, b) => a.nextOccurrence - b.nextOccurrence)
    .map((entry) => entry.discussion);

  const [spotlightEvent, ...restOfUpcomingEvents] = upcomingEvents;

  function handleEventChanged(): void {
    setReloadToken((token) => token + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <ClubHeader
        club={club}
        isMember={isMember}
        lastDiscussionAt={discussions[0]?.createdAt}
        onJoin={() => void handleJoin()}
        isJoining={isJoining}
        onLeft={handleLeft}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {isMember ? (
            <ClubComposer club={club} onPosted={() => setReloadToken((token) => token + 1)} />
          ) : (
            <ClubAboutCard club={club} />
          )}

          {spotlightEvent && (
            <ClubEventCard key={spotlightEvent.id} event={spotlightEvent} isMember={isMember} onChanged={handleEventChanged} />
          )}

          {restOfUpcomingEvents.length > 0 && (
            <UpcomingEventsList events={restOfUpcomingEvents} onChanged={handleEventChanged} />
          )}

          <ClubDiscussionList
            discussions={discussions}
            isMember={isMember}
            onJoin={() => void handleJoin()}
            isJoining={isJoining}
          />
        </div>

        <aside className="w-full shrink-0 lg:w-64">
          <ClubSidebar
            club={club}
            isMember={isMember}
            memberPreviewNames={memberPreviewNames}
            relatedClubs={relatedClubs}
          />
        </aside>
      </div>
    </div>
  );
}
