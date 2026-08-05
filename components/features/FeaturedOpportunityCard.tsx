'use client';

import { IconTrash } from '@tabler/icons-react';
import { deleteDoc, doc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { db } from '@/lib/firebase';
import { formatDeadline } from '@/lib/time';
import type { Opportunity } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

type FeaturedOpportunityCardProps = {
  opportunity: Opportunity;
  onDeleted?: (opportunityId: string) => void;
};

export function FeaturedOpportunityCard({ opportunity, onDeleted }: FeaturedOpportunityCardProps) {
  const { user } = useAuth();
  const isOwnPost = user?.uid === opportunity.posterUid;

  async function handleDelete(): Promise<void> {
    await deleteDoc(doc(db, 'opportunities', opportunity.id));
    onDeleted?.(opportunity.id);
  }

  return (
    <div className="flex flex-col gap-4 rounded-card bg-fresh p-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-pill bg-white/20 px-3 py-1 text-xs font-medium">Featured</span>
          {opportunity.deadline && (
            <span className="text-sm text-white/80">Deadline: {formatDeadline(opportunity.deadline)}</span>
          )}
        </div>

        {isOwnPost && (
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Delete opportunity"
                className="text-white hover:bg-white/20 hover:text-white"
              >
                <IconTrash className="size-4" />
              </Button>
            }
            title="Delete this opportunity?"
            description="This can't be undone."
            confirmLabel="Delete"
            onConfirm={handleDelete}
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] font-medium">{opportunity.title}</h2>
        <p className="text-sm text-white/90">{opportunity.description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* No verification badge — see OpportunityListingCard.tsx for why,
            and where a real one would go once verification exists. */}
        <span className="text-sm text-white/90">Posted by {opportunity.posterName}</span>
        <Button variant="outline" size="sm" className="border-transparent text-fresh hover:bg-cream">
          Apply
        </Button>
      </div>
    </div>
  );
}
