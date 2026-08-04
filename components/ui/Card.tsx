import { cn } from '@/lib/utils';

type CardPadding = 'sm' | 'md' | 'lg';

const PADDING_CLASSES: Record<CardPadding, string> = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

type CardProps = React.ComponentProps<'div'> & {
  padding?: CardPadding;
};

export function Card({ padding = 'md', className, ...props }: CardProps) {
  return (
    <div className={cn('rounded-card bg-white', PADDING_CLASSES[padding], className)} {...props} />
  );
}
