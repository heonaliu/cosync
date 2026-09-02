'use client';

import { IconPinFilled } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { OpportunityListingCard } from '@/components/features/OpportunityListingCard';
import { sortPassedLast } from '@/lib/opportunities';
import { getPinnedIds, setOpportunityPinned } from '@/lib/pins';
import { getSavedOpportunities } from '@/lib/queries';
import type { Opportunity } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

export function SavedOpportunities() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    Promise.all([
      getSavedOpportunities(user.uid),
      getPinnedIds(user.uid).catch((error: unknown) => {
        console.error('Failed to load pins:', error);
        return { projectIds: [], opportunityIds: [] };
      }),
    ])
      .then(([result, pinned]) => {
        if (!cancelled) {
          setOpportunities(result);
          setPinnedIds(pinned.opportunityIds);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load saved opportunities:', error);
        if (!cancelled) setOpportunities([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleTogglePin(opportunityId: string): Promise<void> {
    if (!user) return;
    const wasPinned = pinnedIds.includes(opportunityId);
    setPinnedIds((previous) =>
      wasPinned ? previous.filter((id) => id !== opportunityId) : [...previous, opportunityId]
    );
    try {
      await setOpportunityPinned(user.uid, opportunityId, !wasPinned);
    } catch (error) {
      console.error('Failed to update pin:', error);
      toast.error('Could not update that pin. Try again.');
      setPinnedIds((previous) =>
        wasPinned ? [...previous, opportunityId] : previous.filter((id) => id !== opportunityId)
      );
    }
  }

  if (!user || opportunities === null) {
    return <p className="text-sm text-sand">Loading your saved opportunities…</p>;
  }

  if (opportunities.length === 0) {
    return (
      <p className="text-sm text-oak">
        Nothing saved yet — tap Save on an opportunity to keep it here.
      </p>
    );
  }

  function handleRemoved(opportunityId: string): void {
    setOpportunities((previous) => previous?.filter((item) => item.id !== opportunityId) ?? previous);
  }

  function handleUpdated(updated: Opportunity): void {
    setOpportunities((previous) => previous?.map((item) => (item.id === updated.id ? updated : item)) ?? previous);
  }

  return (
    <div className="flex flex-col gap-4">
      {sortPassedLast(opportunities).map((opportunity) => {
        const isPinned = pinnedIds.includes(opportunity.id);
        return (
          <div key={opportunity.id} className="relative">
            <button
              type="button"
              aria-label={isPinned ? 'Unpin from your profile' : 'Pin to your profile'}
              aria-pressed={isPinned}
              onClick={() => void handleTogglePin(opportunity.id)}
              className={cn(
                'absolute top-4 right-4 z-10 flex size-7 items-center justify-center rounded-full bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
                isPinned ? 'text-deep-amber' : 'text-sand hover:text-oak'
              )}
            >
              <IconPinFilled className="size-4" aria-hidden="true" />
            </button>
            <OpportunityListingCard
              opportunity={opportunity}
              onDeleted={handleRemoved}
              onUnsaved={handleRemoved}
              onUpdated={handleUpdated}
            />
          </div>
        );
      })}
    </div>
  );
}
