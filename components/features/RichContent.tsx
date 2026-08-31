import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

const IMAGE_TOKEN = /(!\[[^\]]*\]\([^)]+\))/g;
const IMAGE_TOKEN_EXACT = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const MENTION_TOKEN = /(@\[[^\]]+\]\([^)]+\))/g;
const MENTION_TOKEN_EXACT = /^@\[([^\]]+)\]\(([^)]+)\)$/;

function renderTextWithMentions(text: string, keyPrefix: string): ReactNode[] {
  return text.split(MENTION_TOKEN).map((part, index) => {
    const match = MENTION_TOKEN_EXACT.exec(part);
    if (match) {
      const [, name, uid] = match;
      return (
        <Link
          key={`${keyPrefix}-${index}`}
          href={`/profile/${uid}`}
          className="font-medium text-deep-fresh hover:underline"
        >
          @{name}
        </Link>
      );
    }
    return part ? <Fragment key={`${keyPrefix}-${index}`}>{part}</Fragment> : null;
  });
}

type RichContentProps = {
  content: string;
  className?: string;
};

// Renders a journal entry / discussion / comment body: plain text with
// @[Name](uid) mention tokens turned into profile links, and ![alt](url)
// markdown image tokens turned into actual inline <img>s — both written by
// CommentComposer/ProjectJournalComposer, never raw text a viewer would see
// as literal markdown syntax.
export function RichContent({ content, className }: RichContentProps) {
  if (!content) return null;

  const segments = content.split(IMAGE_TOKEN);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {segments.map((segment, index) => {
        const imageMatch = IMAGE_TOKEN_EXACT.exec(segment);
        if (imageMatch) {
          const [, alt, url] = imageMatch;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={index}
              src={url}
              alt={alt || 'Posted image'}
              className="max-h-96 w-auto rounded-card border border-olive object-contain"
            />
          );
        }
        if (!segment) return null;
        return (
          <p key={index} className="whitespace-pre-wrap text-sm text-oak">
            {renderTextWithMentions(segment, String(index))}
          </p>
        );
      })}
    </div>
  );
}
