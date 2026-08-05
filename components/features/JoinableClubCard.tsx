'use client';

import Link from 'next/link';
import { toast } from 'sonner';

import { ClubBadge } from '@/components/features/ClubBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import type { Club } from '@/lib/types';
import { useJoinClub } from '@/lib/useJoinClub';

type JoinableClubCardProps = {
  club: Club;
  onJoined?: (clubId: string) => void;
};

export function JoinableClubCard({ club, onJoined }: JoinableClubCardProps) {
  const { join, isJoining } = useJoinClub(club.id);

  async function handleJoin(): Promise<void> {
    try {
      await join();
      onJoined?.(club.id);
    } catch (error) {
      console.error('Failed to join club:', error);
      toast.error('Could not join the club. Try again.');
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <Link href={`/clubs/${club.id}`} className="flex flex-col gap-3 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh">
        <ClubBadge iconName={club.iconName} colorName={club.colorName} />
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-ink hover:underline">{club.name}</h3>
          <p className="text-sm text-oak">{club.description}</p>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-sand">{club.memberCount} members</span>
        <Button size="sm" disabled={isJoining} onClick={() => void handleJoin()}>
          {isJoining ? 'Joining…' : 'Join'}
        </Button>
      </div>
    </Card>
  );
}
