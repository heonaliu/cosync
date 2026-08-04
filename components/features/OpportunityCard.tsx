import { IconShieldCheck } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { formatDeadline } from '@/lib/time';
import type { Opportunity, OpportunityType } from '@/lib/types';

const TYPE_LABELS: Record<OpportunityType, string> = {
  research: 'Research',
  hackathon: 'Hackathon',
  competition: 'Competition',
  mentorship: 'Mentorship',
  program: 'Program',
};

type OpportunityCardProps = {
  opportunity: Opportunity;
  onSave?: () => void;
};

export function OpportunityCard({ opportunity, onSave }: OpportunityCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Chip label={TYPE_LABELS[opportunity.type]} color="lilac" />
        {opportunity.deadline && (
          <span className="whitespace-nowrap text-xs text-sand">
            Deadline: {formatDeadline(opportunity.deadline)}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-ink">{opportunity.title}</h3>
        <p className="text-sm text-oak">{opportunity.description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2 text-sm text-oak">
          <span className="whitespace-nowrap">Posted by {opportunity.posterName}</span>
          {opportunity.posterVerified && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-deep-fresh">
              <IconShieldCheck className="size-4" aria-hidden="true" />
              Verified educator
            </span>
          )}
        </div>
        <Button size="sm" onClick={onSave}>
          Save
        </Button>
      </div>
    </Card>
  );
}
