import type { Opportunity, OpportunityType } from '@/lib/types';

// One list of the built-in types, shared by the Add/Edit forms, every card,
// and the Opportunities page filters. 'other' is the poster-written type:
// its label lives in Opportunity.customType.
export const OPPORTUNITY_TYPE_OPTIONS: { value: OpportunityType; label: string }[] = [
  { value: 'research', label: 'Research' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'competition', label: 'Competition' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'program', label: 'Program' },
  { value: 'other', label: 'Other (write your own)' },
];

export const CUSTOM_TYPE_MAX_LENGTH = 30;

const BUILT_IN_LABELS: Record<OpportunityType, string> = {
  research: 'Research',
  hackathon: 'Hackathon',
  competition: 'Competition',
  mentorship: 'Mentorship',
  program: 'Program',
  other: 'Opportunity',
};

// What to call this opportunity's type on screen — the poster's own words
// for an 'other', the built-in label otherwise.
export function opportunityTypeLabel(opportunity: Pick<Opportunity, 'type' | 'customType'>): string {
  if (opportunity.type === 'other' && opportunity.customType) return opportunity.customType;
  return BUILT_IN_LABELS[opportunity.type] ?? 'Opportunity';
}
