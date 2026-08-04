export type AccentColor = 'sky' | 'amber' | 'sage' | 'lilac';

const ACCENT_COLORS: readonly AccentColor[] = ['sky', 'amber', 'sage', 'lilac'];

const ACCENT_BG: Record<AccentColor, string> = {
  sky: 'bg-sky',
  amber: 'bg-amber',
  sage: 'bg-sage',
  lilac: 'bg-lilac',
};

const ACCENT_TEXT: Record<AccentColor, string> = {
  sky: 'text-deep-sky',
  amber: 'text-deep-amber',
  sage: 'text-deep-fresh',
  lilac: 'text-deep-purple',
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

export function accentClasses(color: AccentColor): { bg: string; text: string } {
  return { bg: ACCENT_BG[color], text: ACCENT_TEXT[color] };
}
