'use client';

import { useEffect, useState } from 'react';

import { JoinableClubCard } from '@/components/features/JoinableClubCard';
import { MyClubCard } from '@/components/features/MyClubCard';
import { StartClubDialog } from '@/components/features/StartClubDialog';
import { PillToggle } from '@/components/ui/PillToggle';
import { getClubDiscussions, getDiscoverableClubs, getUserClubs } from '@/lib/queries';
import { getNextEventOccurrence } from '@/lib/time';
import type { Club, Discussion } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

const FILTERS = ['All', 'Your school', 'Nearby', 'Online'] as const;
type Filter = (typeof FILTERS)[number];

type MyClubEntry = {
  club: Club;
  recentDiscussionCount: number;
  lastDiscussionAt?: number;
  upcomingEvent?: Discussion;
};

function summarizeActivity(discussions: Discussion[]): {
  recentDiscussionCount: number;
  lastDiscussionAt?: number;
  upcomingEvent?: Discussion;
} {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentDiscussionCount = discussions.filter((d) => d.createdAt >= weekAgo).length;
  const lastDiscussionAt = discussions[0]?.createdAt;
  // Soonest upcoming by real next-occurrence, not raw eventDate — a
  // recurring event's stored eventDate can be weeks in the past (it's just
  // the anchor for time-of-day) while the series is still very much
  // upcoming; getNextEventOccurrence accounts for that the same way
  // ClubDetail.tsx does for the detail page's spotlight card.
  const upcomingEvent = discussions
    .filter((d) => d.kind === 'event')
    .map((d) => ({ discussion: d, nextOccurrence: getNextEventOccurrence(d) }))
    .filter((entry): entry is { discussion: Discussion; nextOccurrence: number } => entry.nextOccurrence !== undefined)
    .sort((a, b) => a.nextOccurrence - b.nextOccurrence)[0]?.discussion;
  return { recentDiscussionCount, lastDiscussionAt, upcomingEvent };
}

export function ClubsBoard() {
  const { user } = useAuth();
  const [myClubs, setMyClubs] = useState<MyClubEntry[] | null>(null);
  const [discoverableClubs, setDiscoverableClubs] = useState<Club[] | null>(null);
  const [filter, setFilter] = useState<Filter>('All');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    let cancelled = false;

    async function load(): Promise<void> {
      const [mine, discoverable] = await Promise.all([getUserClubs(uid), getDiscoverableClubs(uid)]);

      const mineWithActivity = await Promise.all(
        mine.map(async (club) => {
          const discussions = await getClubDiscussions(club.id, club).catch(() => []);
          return { club, ...summarizeActivity(discussions) };
        })
      );

      if (!cancelled) {
        setMyClubs(mineWithActivity);
        setDiscoverableClubs(discoverable);
      }
    }

    load().catch((error: unknown) => {
      console.error('Failed to load clubs:', error);
      if (!cancelled) {
        setMyClubs([]);
        setDiscoverableClubs([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, reloadToken]);

  const filteredDiscoverable = (discoverableClubs ?? []).filter((club) => {
    if (filter === 'All' || filter === 'Nearby') return true; // Nearby has no geo data yet — visual only, like Home's feed filters.
    if (filter === 'Your school') return club.scope === 'school';
    return club.scope === 'online';
  });

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[22px] font-medium text-ink">Your clubs</h1>
          <StartClubDialog onCreated={() => setReloadToken((token) => token + 1)} />
        </div>

        {!myClubs && <p className="text-sm text-sand">Loading your clubs…</p>}
        {myClubs && myClubs.length === 0 && (
          <p className="text-sm text-oak">You haven&apos;t joined any clubs yet — browse Discover below.</p>
        )}
        {myClubs && myClubs.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {myClubs.map(({ club, recentDiscussionCount, lastDiscussionAt, upcomingEvent }) => (
              <MyClubCard
                key={club.id}
                club={club}
                recentDiscussionCount={recentDiscussionCount}
                lastDiscussionAt={lastDiscussionAt}
                upcomingEvent={upcomingEvent}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-[22px] font-medium text-ink">Discover clubs</h2>

        <div role="group" aria-label="Club filters" className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <PillToggle
              key={item}
              label={item}
              isActive={filter === item}
              activeColor="purple"
              onClick={() => setFilter(item)}
            />
          ))}
        </div>

        {!discoverableClubs && <p className="text-sm text-sand">Loading clubs…</p>}
        {discoverableClubs && filteredDiscoverable.length === 0 && (
          <p className="text-sm text-oak">No clubs match this filter yet.</p>
        )}
        {filteredDiscoverable.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDiscoverable.map((club) => (
              <JoinableClubCard
                key={club.id}
                club={club}
                onJoined={(clubId) =>
                  setDiscoverableClubs((previous) => previous?.filter((item) => item.id !== clubId) ?? previous)
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
