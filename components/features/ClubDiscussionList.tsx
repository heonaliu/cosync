import { IconLock } from '@tabler/icons-react';

import { DiscussionCard } from '@/components/features/DiscussionCard';
import { Button } from '@/components/ui/button';
import type { Discussion } from '@/lib/types';

type ClubDiscussionListProps = {
  discussions: Discussion[];
  isMember: boolean;
  onJoin: () => void;
  isJoining: boolean;
};

export function ClubDiscussionList({ discussions, isMember, onJoin, isJoining }: ClubDiscussionListProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[22px] font-medium text-ink">Recent discussions</h2>

      {discussions.length === 0 ? (
        <p className="text-sm text-oak">No discussions yet — be the first to post.</p>
      ) : (
        discussions.map((discussion) => (
          <DiscussionCard key={discussion.id} discussion={discussion} muted={!isMember} isMember={isMember} />
        ))
      )}

      {!isMember && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-olive bg-white p-4">
          <span className="inline-flex items-center gap-2 text-sm text-oak">
            <IconLock className="size-4" aria-hidden="true" />
            Join the club to reply and see the full archive.
          </span>
          <Button type="button" disabled={isJoining} onClick={onJoin}>
            {isJoining ? 'Joining…' : 'Join club'}
          </Button>
        </div>
      )}
    </div>
  );
}
