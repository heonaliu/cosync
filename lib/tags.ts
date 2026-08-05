// Single source of truth for the project category tag set — used by
// Discover's category filter and the onboarding survey's interests
// multi-select, so the two stay in sync instead of drifting apart.
export const PROJECT_CATEGORY_TAGS = [
  'Hardware',
  'Software',
  'AI/ML',
  'Robotics',
  'Music',
  'Writing',
] as const;
