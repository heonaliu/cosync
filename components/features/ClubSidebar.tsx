'use client';

import { IconCheck, IconFileText, IconLink, IconPencil, IconWorld } from '@tabler/icons-react';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';

import { EditClubWebsiteDialog } from '@/components/features/EditClubWebsiteDialog';
import { EditLinksDialog } from '@/components/features/EditLinksDialog';
import { MemberAvatarStack } from '@/components/features/MemberAvatarStack';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import type { Club } from '@/lib/types';
import { toExternalHref } from '@/lib/utils';

type ClubSidebarProps = {
  club: Club;
  isMember: boolean;
  isAdmin: boolean;
  memberPreviewNames: string[];
  relatedClubs: Club[];
  onClubChanged: () => void;
};

export function ClubSidebar({ club, isMember, isAdmin, memberPreviewNames, relatedClubs, onClubChanged }: ClubSidebarProps) {
  const pinnedResources = club.pinnedResources ?? [];

  return (
    <div className="flex flex-col gap-6">
      <MemberAvatarStack
        memberNames={memberPreviewNames}
        totalCount={club.memberCount}
        seeAllHref={isMember ? `/clubs/${club.id}/members` : undefined}
      />

      {/* Everyone sees the website under the club's name in ClubHeader —
          this section is just where admins set it. */}
      {isAdmin && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-ink">Website</h2>
            {isAdmin && (
              <EditClubWebsiteDialog
                club={club}
                onSaved={onClubChanged}
                trigger={
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit club website">
                    <IconPencil className="size-4 text-sand" />
                  </Button>
                }
              />
            )}
          </div>
          {club.websiteUrl ? (
            <a
              href={toExternalHref(club.websiteUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 items-center gap-1.5 rounded-pill text-sm text-deep-fresh hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
            >
              <IconWorld className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{club.websiteUrl.replace(/^https?:\/\//, '')}</span>
            </a>
          ) : (
            <p className="text-sm text-sand">Got a club site? Add it here.</p>
          )}
        </div>
      )}

      {isMember && (pinnedResources.length > 0 || isAdmin) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-ink">Pinned resources</h2>
            {isAdmin && (
              <EditLinksDialog
                title="Pinned resources"
                description="Meeting notes, the shared drive, starter guides — anything members keep reaching for. A link is optional."
                initialLinks={pinnedResources}
                urlOptional
                onSave={async (links) => {
                  await updateDoc(doc(db, 'clubs', club.id), {
                    pinnedResources: links.length > 0 ? links : deleteField(),
                  });
                  onClubChanged();
                }}
                trigger={
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit pinned resources">
                    <IconPencil className="size-4 text-sand" />
                  </Button>
                }
              />
            )}
          </div>
          {pinnedResources.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {pinnedResources.map((resource, index) => {
                const Icon = resource.url ? IconLink : IconFileText;
                const content = (
                  <span className="inline-flex items-center gap-1.5 text-sm text-deep-fresh">
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {resource.label}
                  </span>
                );
                return (
                  <li key={`${resource.label}-${index}`}>
                    {resource.url ? (
                      <a
                        href={toExternalHref(resource.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-pill hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
                      >
                        {content}
                      </a>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-sand">Pin the links your members keep asking for.</p>
          )}
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
