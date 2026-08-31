import { cn } from '@/lib/utils';

export function Textarea({ className, ref, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-24 w-full rounded-card border border-olive bg-white px-4 py-2.5 text-sm text-ink placeholder:text-sand',
        'outline-none focus-visible:ring-2 focus-visible:ring-fresh',
        className
      )}
      {...props}
    />
  );
}
