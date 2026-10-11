import { toCloudinaryCover } from '@/lib/imageUpload';
import type { CoverPosition } from '@/lib/types';
import { cn } from '@/lib/utils';

// Both variants share the banner's 10:3 shape on purpose: the owner frames
// the cover by dragging it in the project page's banner, and the saved
// position (object-position %) only shows the same part of the photo when
// the crop has the same shape. A thinner card strip would show a narrower
// slice than what was picked. 'card' is the project-card strip (and the
// upload preview), 'header' the project page banner. Width is what's
// requested from Cloudinary — about 2x the largest size each is shown at.
export const COVER_ASPECT_CLASS = 'aspect-[10/3]';

const SIZES = {
  card: { width: 800, className: COVER_ASPECT_CLASS },
  header: { width: 1600, className: COVER_ASPECT_CLASS },
} as const;

type ProjectCoverProps = {
  url: string;
  variant: keyof typeof SIZES;
  /** The owner's dragged-to focal point; centered when absent. */
  position?: CoverPosition;
  className?: string;
};

export function ProjectCover({ url, variant, position, className }: ProjectCoverProps) {
  const size = SIZES[variant];
  return (
    // Not next/image — Cloudinary already serves a resized, optimized
    // version (toCloudinaryCover), same reasoning as Avatar and RichContent.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={toCloudinaryCover(url, size.width)}
      alt=""
      loading="lazy"
      draggable={false}
      style={{ objectPosition: `${position?.x ?? 50}% ${position?.y ?? 50}%` }}
      className={cn('w-full select-none bg-cream object-cover', size.className, className)}
    />
  );
}
