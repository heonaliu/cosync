import Link from 'next/link';

import { AvatarStack } from '@/components/ui/AvatarStack';

type MemberAvatarStackProps = {
  memberNames: string[];
  totalCount: number;
  seeAllHref?: string;
};

export function MemberAvatarStack({ memberNames, totalCount, seeAllHref }: MemberAvatarStackProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-ink">Members ({totalCount})</p>
      <AvatarStack names={memberNames} totalCount={totalCount} />
      {seeAllHref && (
        <Link href={seeAllHref} className="text-sm text-deep-fresh hover:underline">
          See all members
        </Link>
      )}
    </div>
  );
}
