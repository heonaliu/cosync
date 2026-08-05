import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

type AvatarStackProps = {
  names: string[];
  /** Total member/collaborator count — when it's larger than names.length,
   * an "+N" bubble renders after the visible avatars. */
  totalCount?: number;
  size?: 'sm' | 'md';
  className?: string;
};

// Just the overlapping circles — no "Members (N)" label, no "See all" link.
// MemberAvatarStack wraps this for the club sidebar's fuller block; project
// cards and the project header use it directly since they each pair it with
// different surrounding text.
export function AvatarStack({ names, totalCount, size = 'sm', className }: AvatarStackProps) {
  const overflow = (totalCount ?? names.length) - names.length;

  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {names.map((name, index) => (
        <Avatar key={`${name}-${index}`} name={name} size={size} decorative className="ring-2 ring-cream" />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-olive text-xs font-medium text-oak ring-2 ring-cream',
            size === 'sm' ? 'size-8' : 'size-10'
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
