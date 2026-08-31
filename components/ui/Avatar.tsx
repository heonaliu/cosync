'use client';

import { useState } from 'react';

import { accentClasses, accentColorFor } from '@/lib/color';
import { cn } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-16 text-lg',
};

type AvatarProps = {
  name: string;
  size?: AvatarSize;
  /** A real photo (e.g. the Google account photo synced onto users/{uid})
   * — falls back to the initials circle below when absent or when it fails
   * to load, so a broken/expired photo URL never renders a blank box. */
  photoURL?: string | null;
  /** Pass true when the person's name is already visible as adjacent text,
   * so the avatar doesn't get announced twice by screen readers. */
  decorative?: boolean;
  className?: string;
};

export function Avatar({ name, size = 'md', photoURL, decorative = false, className }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const { bg, text } = accentClasses(accentColorFor(name));
  const a11yProps = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': `${name}'s avatar` };

  if (photoURL && !imageFailed) {
    return (
      // External Google photo URLs aren't in next.config's image domains
      // allowlist, and adding one just for this would be a bigger config
      // change than a plain <img> here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoURL}
        alt={decorative ? '' : `${name}'s avatar`}
        aria-hidden={decorative || undefined}
        onError={() => setImageFailed(true)}
        className={cn('inline-flex shrink-0 rounded-full object-cover', SIZE_CLASSES[size], className)}
      />
    );
  }

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
