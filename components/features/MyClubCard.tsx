import { IconCalendarEvent, IconMessageCircle } from '@tabler/icons-react';
import Link from 'next/link';

import { ClubBadge } from '@/components/features/ClubBadge';
import { accentClasses } from '@/lib/color';
import { formatClubActivity } from '@/lib/time';
import type { Club, Discussion } from '@/lib/types';
import { cn } from '@/lib/utils';

type MyClubCardProps = {
  club: Club;
  recentDiscussionCount: number;
  lastDiscussionAt?: number;
  upcomingEvent?: Discussion;
};

export function MyClubCard({ club, recentDiscussionCount, lastDiscussionAt, upcomingEvent }: MyClubCardProps) {
  const { bg } = accentClasses(club.colorName);

  return (
    <Link
      href={`/clubs/${club.id}`}
      className={cn(
        'flex flex-col gap-4 rounded-card p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
        bg
      )}
    >
      <div className="flex items-center gap-3">
        <ClubBadge iconName={club.iconName} colorName={club.colorName} inverted />
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-ink">{club.name}</h3>
          <p className="text-xs text-oak">
            {club.memberCount} members · {formatClubActivity(lastDiscussionAt)}
          </p>
        </div>
      </div>

      <p className="text-sm text-oak">{club.description}</p>

      <div className="flex items-center gap-1.5 text-xs text-oak">
        {upcomingEvent ? (
          <>
            <IconCalendarEvent className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              Event {upcomingEvent.title} · {upcomingEvent.goingCount ?? 0} going
            </span>
          </>
        ) : (
          <>
            <IconMessageCircle className="size-4 shrink-0" aria-hidden="true" />
            {recentDiscussionCount} new discussion{recentDiscussionCount === 1 ? '' : 's'}
          </>
        )}
      </div>
    </Link>
  );
}
