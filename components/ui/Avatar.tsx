import { accentClasses, accentColorFor } from '@/lib/color';
import { cn } from '@/lib/utils';

type AvatarSize = 'sm' | 'md';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
};

type AvatarProps = {
  name: string;
  size?: AvatarSize;
  /** Pass true when the person's name is already visible as adjacent text,
   * so the avatar doesn't get announced twice by screen readers. */
  decorative?: boolean;
  className?: string;
};

export function Avatar({ name, size = 'md', decorative = false, className }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const { bg, text } = accentClasses(accentColorFor(name));
  const a11yProps = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': `${name}'s avatar` };

  return (
    <span
      {...a11yProps}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium',
        bg,
        text,
        SIZE_CLASSES[size],
        className
      )}
    >
      {initial}
    </span>
  );
}
