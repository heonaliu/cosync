'use client';

import { IconBookmark, IconBookmarkFilled, IconPencil, IconTrash } from '@tabler/icons-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';

import { EditOpportunityDialog } from '@/components/features/EditOpportunityDialog';
import { OpportunityDetailsDialog } from '@/components/features/OpportunityDetailsDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  accentColorFor,
  moderationStatusColorFor,
  MODERATION_STATUS_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  opportunityStatusColorFor,
  type AccentColor,
} from '@/lib/color';
import { db } from '@/lib/firebase';
import { opportunityTypeLabel } from '@/lib/opportunityTypes';
import { formatDeadline } from '@/lib/time';
import type { Opportunity, OpportunityType } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { useSavedOpportunity } from '@/lib/useSavedOpportunity';
import { cn, truncateText } from '@/lib/utils';

// Colors called out explicitly for these three; program has none specified
// so colorForType() below falls back to the shared tag-color hash for it.
const TYPE_COLORS: Partial<Record<OpportunityType, AccentColor>> = {
  hackathon: 'amber',
  competition: 'sky',
  mentorship: 'sage',
  research: 'lilac',
};

// A written-in type gets a color hashed from its own label, so "Summer
// camp" posts all share one color instead of every 'other' looking alike.
function colorForType(opportunity: Pick<Opportunity, 'type' | 'customType'>): AccentColor {
  return TYPE_COLORS[opportunity.type] ?? accentColorFor(opportunity.customType ?? opportunity.type);
}

type OpportunityListingCardProps = {
  opportunity: Opportunity;
  /** Called after a successful delete so the parent can drop this card from
   * its list without a full refetch/reload. */
  onDeleted?: (opportunityId: string) => void;
  /** Called after a successful un-save — used by /saved so un-saving there
   * removes the card immediately instead of leaving a stale entry. */
  onUnsaved?: (opportunityId: string) => void;
  /** Called after a successful edit with the fully updated opportunity, so
   * the parent can splice it into its local list in place — same idea as
   * onDeleted, but a replace instead of a removal. */
  onUpdated?: (updated: Opportunity) => void;
  /** Shows a pending/approved/rejected chip next to the type chip. Only
   * ProfileView's "My submissions" section passes this — everywhere else,
   * every card a viewer can see is already 'approved' by definition (see
   * firestore.rules), so the chip would just be noise. */
  showModerationStatus?: boolean;
};

export function OpportunityListingCard({
  opportunity,
  onDeleted,
  onUnsaved,
  onUpdated,
  showModerationStatus,
}: OpportunityListingCardProps) {
  const { user } = useAuth();
  const { isSaved, isLoading, toggle } = useSavedOpportunity(opportunity);
  const isOwnPost = user?.uid === opportunity.posterUid;

  const metadataParts = [
    opportunity.deadline ? `Deadline: ${formatDeadline(opportunity.deadline)}` : null,
    opportunity.location,
    opportunity.ageRange ? `Ages ${opportunity.ageRange}` : null,
  ].filter((part): part is string => Boolean(part));

  async function handleSaveClick(): Promise<void> {
    const wasSaved = isSaved;
    try {
      await toggle();
      if (wasSaved) onUnsaved?.(opportunity.id);
    } catch (error) {
      console.error('Failed to update saved state:', error);
      toast.error('Could not update saved state. Try again.');
    }
  }

  async function handleDelete(): Promise<void> {
    await deleteDoc(doc(db, 'opportunities', opportunity.id));
    onDeleted?.(opportunity.id);
  }

  return (
    <Card
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        opportunity.status === 'passed' && 'opacity-60'
      )}
    >
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip label={opportunityTypeLabel(opportunity)} color={colorForType(opportunity)} />
          {showModerationStatus && (
            <Chip
              label={MODERATION_STATUS_LABELS[opportunity.moderationStatus]}
              color={moderationStatusColorFor(opportunity.moderationStatus)}
            />
          )}
          {opportunity.status && (
            <Chip
              label={OPPORTUNITY_STATUS_LABELS[opportunity.status]}
              color={opportunityStatusColorFor(opportunity.status)}
            />
          )}
        </div>

        {metadataParts.length > 0 && <p className="text-xs text-sand">{metadataParts.join(' · ')}</p>}
        {opportunity.status === 'soon' && opportunity.openDate && (
          <p className="text-xs text-sand">Opens {formatDeadline(opportunity.openDate)}</p>
        )}

        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-ink">{opportunity.title}</h3>
          <p className="text-sm text-oak">{truncateText(opportunity.description)}</p>
        </div>

        {/* Deliberately no verification badge. `opportunity.posterVerified`
            already exists on the type (see Home's OpportunityCard for how it
            renders one) but showing it here would fake a moderation system
            that doesn't exist yet. Once real verification ships, gate a
            badge on `opportunity.posterVerified` right here, next to the name. */}
        <p className="text-sm text-oak">Posted by {opportunity.posterName}</p>
      </div>

      <div className="flex shrink-0 items-start gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={isSaved ? 'Remove from saved' : 'Save opportunity'}
          aria-pressed={isSaved}
          disabled={isLoading}
          onClick={() => void handleSaveClick()}
          className={cn('active:scale-95', isSaved && 'text-deep-fresh')}
        >
          {isSaved ? <IconBookmarkFilled className="size-4" /> : <IconBookmark className="size-4" />}
        </Button>
        <OpportunityDetailsDialog opportunity={opportunity} trigger={<Button size="sm">Learn more</Button>} />

        {isOwnPost && (
          <>
            <EditOpportunityDialog
              opportunity={opportunity}
              onSaved={(updated) => onUpdated?.(updated)}
              trigger={
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit opportunity">
                  <IconPencil className="size-4 text-sand" />
                </Button>
              }
            />
            <ConfirmDialog
              trigger={
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete opportunity">
                  <IconTrash className="size-4 text-sand" />
                </Button>
              }
              title="Delete this opportunity?"
              description="This can't be undone."
              confirmLabel="Delete"
              onConfirm={handleDelete}
            />
          </>
        )}
      </div>
    </Card>
  );
}
