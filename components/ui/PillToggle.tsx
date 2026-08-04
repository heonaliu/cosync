import { cn } from '@/lib/utils';

type PillActiveColor = 'fresh' | 'purple' | 'amber';

const ACTIVE_CLASSES: Record<PillActiveColor, string> = {
  fresh: 'bg-fresh text-white',
  purple: 'bg-purple text-white',
  amber: 'bg-amber text-deep-amber',
};

type PillToggleProps = {
  label: string;
  isActive: boolean;
  activeColor?: PillActiveColor;
  onClick: () => void;
};

export function PillToggle({ label, isActive, activeColor = 'fresh', onClick }: PillToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        'whitespace-nowrap rounded-pill px-4 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
        isActive ? ACTIVE_CLASSES[activeColor] : 'border border-olive bg-white text-ink hover:bg-cream'
      )}
    >
      {label}
    </button>
  );
}
