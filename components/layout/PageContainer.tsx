import { cn } from '@/lib/utils';

export function PageContainer({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('mx-auto w-full max-w-5xl bg-cream px-4 py-8 sm:px-6 lg:px-8', className)}
      {...props}
    />
  );
}
