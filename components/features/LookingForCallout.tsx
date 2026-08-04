import { cn } from '@/lib/utils';

type LookingForCalloutProps = {
  role: string;
  className?: string;
};

// No whitespace-nowrap here (unlike Chip) — "Looking for firmware help" is
// allowed to wrap at a word boundary on narrow screens instead of overflowing.
export function LookingForCallout({ role, className }: LookingForCalloutProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-pill bg-amber px-3 py-1 text-xs font-medium text-deep-amber',
        className
      )}
    >
      Looking for {role}
    </span>
  );
}
