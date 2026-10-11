import type { ReactNode } from 'react';

import { AvatarStack } from '@/components/ui/AvatarStack';

type MemberAvatarStackProps = {
  memberNames: string[];
  totalCount: number;
  /** e.g. a "See all members" button that opens ClubMembersDialog. */
  seeAll?: ReactNode;
};

export function MemberAvatarStack({ memberNames, totalCount, seeAll }: MemberAvatarStackProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-ink">Members ({totalCount})</p>
      <AvatarStack names={memberNames} totalCount={totalCount} />
      {seeAll}
    </div>
  );
}
