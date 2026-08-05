import { IconCheck, IconFileText, IconLink } from '@tabler/icons-react';
import Link from 'next/link';

import { MemberAvatarStack } from '@/components/features/MemberAvatarStack';
import type { Club } from '@/lib/types';

type ClubSidebarProps = {
  club: Club;
  isMember: boolean;
  memberPreviewNames: string[];
  relatedClubs: Club[];
};

export function ClubSidebar({ club, isMember, memberPreviewNames, relatedClubs }: ClubSidebarProps) {
  return (
    <div className="flex flex-col gap-6">
      <MemberAvatarStack
        memberNames={memberPreviewNames}
        totalCount={club.memberCount}
        seeAllHref={isMember ? `/clubs/${club.id}/members` : undefined}
      />

      {isMember && club.pinnedResources && club.pinnedResources.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-ink">Pinned resources</h2>
          <ul className="flex flex-col gap-2">
            {club.pinnedResources.map((resource) => {
              const Icon = resource.url ? IconLink : IconFileText;
              const content = (
                <span className="inline-flex items-center gap-1.5 text-sm text-deep-fresh">
                  <Icon className="size-4" aria-hidden="true" />
                  {resource.label}
                </span>
              );
              return (
                <li key={resource.label}>
                  {resource.url ? <Link href={resource.url}>{content}</Link> : content}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!isMember && club.whatYoullGet && club.whatYoullGet.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-ink">What you&apos;ll get</h2>
          <ul className="flex flex-col gap-2">
            {club.whatYoullGet.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm text-oak">
                <IconCheck className="mt-0.5 size-4 shrink-0 text-deep-fresh" aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      )}

      {relatedClubs.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-ink">Related clubs</h2>
          <ul className="flex flex-col gap-3">
            {relatedClubs.map((related) => (
              <li key={related.id}>
                <Link href={`/clubs/${related.id}`} className="flex flex-col hover:underline">
                  <span className="text-sm text-ink">{related.name}</span>
                  <span className="text-xs text-sand">{related.memberCount} members</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
