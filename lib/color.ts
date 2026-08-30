import type { OpportunityStatus, ProjectStage } from '@/lib/types';

export type AccentColor = 'sky' | 'amber' | 'sage' | 'lilac' | 'peach';

// peach is excluded from the hash rotation below (ACCENT_COLORS) — it's only
// reachable by explicit choice (the club color picker), not by hashing a tag
// name, so the four-color hash distribution for tags/avatars stays unchanged.
const ACCENT_COLORS: readonly AccentColor[] = ['sky', 'amber', 'sage', 'lilac'];

const ACCENT_BG: Record<AccentColor, string> = {
  sky: 'bg-sky',
  amber: 'bg-amber',
  sage: 'bg-sage',
  lilac: 'bg-lilac',
  peach: 'bg-peach',
};

const ACCENT_TEXT: Record<AccentColor, string> = {
  sky: 'text-deep-sky',
  amber: 'text-deep-amber',
  sage: 'text-deep-fresh',
  lilac: 'text-deep-purple',
  // No deep-peach token exists in tailwind.config.ts, so this reuses ink
  // rather than inventing an unlisted hex value.
  peach: 'text-ink',
};

// A few category tags have a color the design calls out explicitly (e.g.
// Discover's category filters). Everything else falls back to the hash below
// so still-unstyled tags get a stable color instead of no color at all.
const NAMED_TAG_COLORS: Record<string, AccentColor> = {
  Hardware: 'sky',
  Music: 'amber',
  Robotics: 'sage',
  AI: 'lilac',
  Writing: 'sky',
  Bio: 'sage',
};

// Same seed always maps to the same accent so a person's avatar or a tag's
// chip color stays stable across the app instead of reshuffling per render.
export function accentColorFor(seed: string): AccentColor {
  if (seed in NAMED_TAG_COLORS) return NAMED_TAG_COLORS[seed];

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return ACCENT_COLORS[hash % ACCENT_COLORS.length];
}

// The "deep" pairing of each tint — used when a badge needs to sit on top of
// its own light tint (e.g. a club icon badge on that same club's tinted
// card) and the light-bg/deep-icon pairing from accentClasses would have no
// contrast against itself. peach has no deep-peach token, so it reuses ink.
const ACCENT_DEEP_BG: Record<AccentColor, string> = {
  sky: 'bg-deep-sky',
  amber: 'bg-deep-amber',
  sage: 'bg-deep-fresh',
  lilac: 'bg-deep-purple',
  peach: 'bg-ink',
};

export function accentClasses(color: AccentColor, options?: { inverted?: boolean }): { bg: string; text: string } {
  if (options?.inverted) {
    return { bg: ACCENT_DEEP_BG[color], text: 'text-white' };
  }
  return { bg: ACCENT_BG[color], text: ACCENT_TEXT[color] };
}

// A project's stage pill has a fixed color per stage (unlike tags, which
// hash) — idea reads as "just started" (green), prototyping/shipping both
// read as "actively moving" (amber), differentiated by their label text
// rather than a fourth color.
const STAGE_COLORS: Record<ProjectStage, AccentColor> = {
  idea: 'sage',
  prototyping: 'amber',
  shipping: 'amber',
};

export const STAGE_LABELS: Record<ProjectStage, string> = {
  idea: 'Idea',
  prototyping: 'Prototyping',
  shipping: 'Shipping',
};

export function stageColorFor(stage: ProjectStage): AccentColor {
  return STAGE_COLORS[stage];
}

// Same fixed-per-value approach as stage. 'passed' gets peach rather than
// reusing one of the three "active" colors — it's not in the same rotation
// as rolling/ongoing/soon (which all mean "you can still act on this"), and
// peach isn't one of the named type-chip colors (see TYPE_COLORS in the
// opportunity card components), so a status chip never looks like it could
// be mistaken for the type chip next to it.
const OPPORTUNITY_STATUS_COLORS: Record<OpportunityStatus, AccentColor> = {
  rolling: 'sky',
  ongoing: 'sage',
  soon: 'amber',
  passed: 'peach',
};

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  rolling: 'Rolling admissions',
  ongoing: 'Ongoing',
  soon: 'Opening soon',
  passed: 'Passed',
};

export function opportunityStatusColorFor(status: OpportunityStatus): AccentColor {
  return OPPORTUNITY_STATUS_COLORS[status];
}
