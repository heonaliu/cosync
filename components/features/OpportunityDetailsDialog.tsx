'use client';

import { IconExternalLink } from '@tabler/icons-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatCountries } from '@/lib/countries';
import { formatGradeRange } from '@/lib/gradeRange';
import { opportunityTypeLabel } from '@/lib/opportunityTypes';
import { formatDeadline } from '@/lib/time';
import type { Opportunity, OpportunityType } from '@/lib/types';
import { toExternalHref } from '@/lib/utils';

// What the modal's outbound button says, per type.
const APPLY_LABELS: Record<OpportunityType, string> = {
  hackathon: 'Register',
  competition: 'Enter',
  mentorship: 'Apply',
  research: 'Apply',
  program: 'Apply',
  other: 'Apply',
};

type OpportunityDetailsDialogProps = {
  opportunity: Opportunity;
  trigger: React.ReactNode;
};

// The full opportunity. Cards only show a ~150-character, single-paragraph
// preview of the description (lib/utils.ts's truncateText); this is where
// the whole thing reads, with the poster's own line breaks kept.
export function OpportunityDetailsDialog({ opportunity, trigger }: OpportunityDetailsDialogProps) {
  const details = [
    opportunity.deadline ? `Deadline: ${formatDeadline(opportunity.deadline)}` : null,
    opportunity.status === 'soon' && opportunity.openDate ? `Opens ${formatDeadline(opportunity.openDate)}` : null,
    opportunity.location,
    opportunity.ageRange ? `Ages ${opportunity.ageRange}` : null,
    formatGradeRange(opportunity.gradeMin, opportunity.gradeMax),
    formatCountries(opportunity.countries),
  ].filter((part): part is string => Boolean(part));

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <span className="text-xs text-sand">{opportunityTypeLabel(opportunity)}</span>
          <DialogTitle>{opportunity.title}</DialogTitle>
          <DialogDescription>
            Posted by{' '}
            <Link href={`/profile/${opportunity.posterUid}`} className="font-medium text-oak hover:underline">
              {opportunity.posterName}
            </Link>
          </DialogDescription>
        </DialogHeader>

        {details.length > 0 && <p className="text-xs text-sand">{details.join(' · ')}</p>}

        <p className="whitespace-pre-wrap text-sm text-oak">{opportunity.description}</p>

        {opportunity.tags.length > 0 && <p className="text-xs text-sand">{opportunity.tags.join(' · ')}</p>}

        {opportunity.applicationUrl && (
          <DialogFooter>
            <Button asChild>
              <a href={toExternalHref(opportunity.applicationUrl)} target="_blank" rel="noopener noreferrer">
                {APPLY_LABELS[opportunity.type] ?? 'Apply'}
                <IconExternalLink className="size-4" aria-hidden="true" />
              </a>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
