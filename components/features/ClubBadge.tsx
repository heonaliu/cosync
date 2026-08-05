import { Badge } from '@/components/ui/Badge';
import { clubIconFor } from '@/lib/clubIcons';
import type { ClubColorName, ClubIconName } from '@/lib/types';

type ClubBadgeProps = {
  iconName: ClubIconName;
  colorName: ClubColorName;
  size?: 'md' | 'lg';
  /** Pass true when the badge sits on a card already tinted with this same
   * club's color (see Badge's `inverted` prop for why). */
  inverted?: boolean;
  className?: string;
};

// Thin domain wrapper around the generic ui/Badge — resolves a club's stored
// iconName/colorName strings to an actual icon component + accent color, so
// that mapping lives in one place instead of being repeated at every call
// site (clubs list cards, club detail header, Start a Club preview).
export function ClubBadge({ iconName, colorName, size = 'md', inverted = false, className }: ClubBadgeProps) {
  return (
    <Badge
      icon={clubIconFor(iconName)}
      color={colorName}
      size={size}
      inverted={inverted}
      className={className}
    />
  );
}
