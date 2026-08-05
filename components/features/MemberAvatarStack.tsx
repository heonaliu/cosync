import Link from 'next/link';

import { Avatar } from '@/components/ui/Avatar';

type MemberAvatarStackProps = {
  memberNames: string[];
  totalCount: number;
  seeAllHref?: string;
};

export function MemberAvatarStack({ memberNames, totalCount, seeAllHref }: MemberAvatarStackProps) {
  const overflow = totalCount - memberNames.length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-ink">Members ({totalCount})</p>
      <div className="flex items-center -space-x-2">
        {memberNames.map((name, index) => (
          <Avatar key={`${name}-${index}`} name={name} size="sm" decorative className="ring-2 ring-cream" />
        ))}
        {overflow > 0 && (
          <span className="flex size-8 items-center justify-center rounded-full bg-olive text-xs font-medium text-oak ring-2 ring-cream">
            +{overflow}
          </span>
        )}
      </div>
      {seeAllHref && (
        <Link href={seeAllHref} className="text-sm text-deep-fresh hover:underline">
          See all members
        </Link>
      )}
    </div>
  );
}
