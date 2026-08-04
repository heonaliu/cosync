import { cn } from '@/lib/utils';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-pill border border-olive bg-white px-4 text-sm text-ink placeholder:text-sand',
        'outline-none focus-visible:ring-2 focus-visible:ring-fresh',
        className
      )}
      {...props}
    />
  );
}
