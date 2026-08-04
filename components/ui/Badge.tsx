import { accentClasses, type AccentColor } from '@/lib/color';
import { cn } from '@/lib/utils';

type BadgeSize = 'md' | 'lg';

// 12px radius on a 40x40 box, 16px radius on a 64x64 box, per the design tokens.
const SIZE_CLASSES: Record<BadgeSize, string> = {
  md: 'size-10 rounded-[12px]',
  lg: 'size-16 rounded-[16px]',
};

const ICON_SIZE_CLASSES: Record<BadgeSize, string> = {
  md: 'size-5',
  lg: 'size-7',
};

type BadgeProps = {
  icon: React.ComponentType<{ className?: string }>;
  color: AccentColor;
  size?: BadgeSize;
  className?: string;
};

export function Badge({ icon: Icon, color, size = 'md', className }: BadgeProps) {
  const { bg, text } = accentClasses(color);

  return (
    <span aria-hidden="true" className={cn('inline-flex items-center justify-center', bg, SIZE_CLASSES[size], className)}>
      <Icon className={cn(ICON_SIZE_CLASSES[size], text)} />
    </span>
  );
}
