'use client';

import { IconPencil, IconTrash } from '@tabler/icons-react';
import { deleteDoc, doc } from 'firebase/firestore';

import { EditOpportunityDialog } from '@/components/features/EditOpportunityDialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { OPPORTUNITY_STATUS_LABELS } from '@/lib/color';
import { db } from '@/lib/firebase';
import { formatDeadline } from '@/lib/time';
import type { Opportunity } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

type FeaturedOpportunityCardProps = {
  opportunity: Opportunity;
  onDeleted?: (opportunityId: string) => void;
  /** Called after a successful edit with the fully updated opportunity — see
   * OpportunityListingCard.tsx's onUpdated for the same pattern. */
  onUpdated?: (updated: Opportunity) => void;
};

export function FeaturedOpportunityCard({ opportunity, onDeleted, onUpdated }: FeaturedOpportunityCardProps) {
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
          {opportunity.status && (
            <span className="rounded-pill bg-white/20 px-3 py-1 text-xs font-medium">
              {OPPORTUNITY_STATUS_LABELS[opportunity.status]}
            </span>
          )}
          {opportunity.deadline && (
            <span className="text-sm text-white/80">Deadline: {formatDeadline(opportunity.deadline)}</span>
          )}
          {opportunity.status === 'soon' && opportunity.openDate && (
            <span className="text-sm text-white/80">Opens {formatDeadline(opportunity.openDate)}</span>
          )}
        </div>

        {isOwnPost && (
          <div className="flex items-center gap-1">
            <EditOpportunityDialog
              opportunity={opportunity}
              onSaved={(updated) => onUpdated?.(updated)}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit opportunity"
                  className="text-white hover:bg-white/20 hover:text-white"
                >
                  <IconPencil className="size-4" />
                </Button>
              }
            />
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
          </div>
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
