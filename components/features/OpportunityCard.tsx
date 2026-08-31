'use client';

import { IconMapPin, IconShieldCheck, IconSparkles } from '@tabler/icons-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { OPPORTUNITY_STATUS_LABELS, opportunityStatusColorFor } from '@/lib/color';
import { formatDeadline } from '@/lib/time';
import type { Opportunity, OpportunityType } from '@/lib/types';
import { useSavedOpportunity } from '@/lib/useSavedOpportunity';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<OpportunityType, string> = {
  research: 'Research',
  hackathon: 'Hackathon',
  competition: 'Competition',
  mentorship: 'Mentorship',
  program: 'Program',
};

type OpportunityCardProps = {
  opportunity: Opportunity;
  /** Shows a "Recommended · ..." line above the type chip — same prop/
   * rendering as ProjectCard's, used by Home's "For you" tab so a
   * personalized opportunity reads the same way a personalized project
   * does, instead of looking identical to an unfiltered listing. */
  recommendationReason?: string;
};

// Home's opportunity card. Save reads/writes the same
// users/{uid}/savedOpportunities subcollection as OpportunityListingCard
// (the /opportunities page's card) via the same useSavedOpportunity hook —
// a save made here shows up on /opportunities and /saved and vice versa
// with no extra wiring, since both cards are just two views onto one hook.
export function OpportunityCard({ opportunity, recommendationReason }: OpportunityCardProps) {
  const { isSaved, isLoading, toggle } = useSavedOpportunity(opportunity);

  async function handleSaveClick(): Promise<void> {
    try {
      await toggle();
    } catch (error) {
      console.error('Failed to update saved state:', error);
      toast.error('Could not update saved state. Try again.');
    }
  }

  return (
    <Card className={cn('flex flex-col gap-3', opportunity.status === 'passed' && 'opacity-60')}>
      {recommendationReason && (
        <div className="flex items-center gap-1.5 text-xs text-sand">
          <IconSparkles className="size-3.5 text-deep-fresh" aria-hidden="true" />
          <span>Recommended · {recommendationReason}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Chip label={TYPE_LABELS[opportunity.type]} color="lilac" />
        {opportunity.status && (
          <Chip
            label={OPPORTUNITY_STATUS_LABELS[opportunity.status]}
            color={opportunityStatusColorFor(opportunity.status)}
          />
        )}
        {opportunity.deadline && (
          <span className="whitespace-nowrap text-xs text-sand">
            Deadline: {formatDeadline(opportunity.deadline)}
          </span>
        )}
        {opportunity.status === 'soon' && opportunity.openDate && (
          <span className="whitespace-nowrap text-xs text-sand">Opens {formatDeadline(opportunity.openDate)}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-ink">{opportunity.title}</h3>
        <p className="text-sm text-oak">{opportunity.description}</p>
        {opportunity.location && (
          <span className="inline-flex items-center gap-1 text-xs text-sand">
            <IconMapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {opportunity.location}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2 text-sm text-oak">
          <span className="whitespace-nowrap">
            Posted by{' '}
            <Link href={`/profile/${opportunity.posterUid}`} className="font-medium hover:underline">
              {opportunity.posterName}
            </Link>
          </span>
          {opportunity.posterVerified && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-deep-fresh">
              <IconShieldCheck className="size-4" aria-hidden="true" />
              Verified educator
            </span>
          )}
        </div>
        <Button
          type="button"
          variant={isSaved ? 'dark' : 'outline'}
          size="sm"
          disabled={isLoading}
          onClick={() => void handleSaveClick()}
        >
          {isSaved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </Card>
  );
}
