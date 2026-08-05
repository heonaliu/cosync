'use client';

import { IconTrash } from '@tabler/icons-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { accentColorFor, type AccentColor } from '@/lib/color';
import { db } from '@/lib/firebase';
import { formatDeadline } from '@/lib/time';
import type { Opportunity, OpportunityType } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { useSavedOpportunity } from '@/lib/useSavedOpportunity';

const TYPE_LABELS: Record<OpportunityType, string> = {
  research: 'Research',
  hackathon: 'Hackathon',
  competition: 'Competition',
  mentorship: 'Mentorship',
  program: 'Program',
};

// Colors called out explicitly for these three; program has none specified
// so colorForType() below falls back to the shared tag-color hash for it.
const TYPE_COLORS: Partial<Record<OpportunityType, AccentColor>> = {
  hackathon: 'amber',
  competition: 'sky',
  mentorship: 'sage',
  research: 'lilac',
};

const CTA_LABELS: Record<OpportunityType, string> = {
  hackathon: 'Register',
  competition: 'Learn more',
  mentorship: 'Apply',
  research: 'Apply',
  program: 'Learn more',
};

function colorForType(type: OpportunityType): AccentColor {
  return TYPE_COLORS[type] ?? accentColorFor(type);
}

type OpportunityListingCardProps = {
  opportunity: Opportunity;
  /** Called after a successful delete so the parent can drop this card from
   * its list without a full refetch/reload. */
  onDeleted?: (opportunityId: string) => void;
  /** Called after a successful un-save — used by /saved so un-saving there
   * removes the card immediately instead of leaving a stale entry. */
  onUnsaved?: (opportunityId: string) => void;
};

export function OpportunityListingCard({ opportunity, onDeleted, onUnsaved }: OpportunityListingCardProps) {
  const { user } = useAuth();
  const { isSaved, isLoading, toggle } = useSavedOpportunity(opportunity);
  const isOwnPost = user?.uid === opportunity.posterUid;

  const metadataParts = [
    opportunity.deadline ? `Deadline: ${formatDeadline(opportunity.deadline)}` : null,
    opportunity.location,
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
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-1 flex-col gap-3">
        <Chip label={TYPE_LABELS[opportunity.type]} color={colorForType(opportunity.type)} />

        {metadataParts.length > 0 && <p className="text-xs text-sand">{metadataParts.join(' · ')}</p>}

        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-ink">{opportunity.title}</h3>
          <p className="text-sm text-oak">{opportunity.description}</p>
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
          variant={isSaved ? 'dark' : 'outline'}
          size="sm"
          disabled={isLoading}
          onClick={() => void handleSaveClick()}
          className="active:scale-95"
        >
          {isSaved ? 'Saved' : 'Save'}
        </Button>
        <Button size="sm">{CTA_LABELS[opportunity.type]}</Button>

        {isOwnPost && (
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
        )}
      </div>
    </Card>
  );
}
