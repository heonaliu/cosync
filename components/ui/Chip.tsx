import { accentClasses, accentColorFor, type AccentColor } from '@/lib/color';
import { cn } from '@/lib/utils';

type ChipProps = {
  label: string;
  color?: AccentColor;
  className?: string;
};

// Tag text hashes to one of four accent colors when no color is given, so
// the same tag (e.g. "Hardware") always renders in the same color everywhere
// it appears, without the caller having to track a color-to-tag mapping.
export function Chip({ label, color, className }: ChipProps) {
  const resolved = color ?? accentColorFor(label);
  const { bg, text } = accentClasses(resolved);

  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-pill px-3 py-1 text-xs font-medium',
        bg,
        text,
        className
      )}
    >
      {label}
    </span>
  );
}
