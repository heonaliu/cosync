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

// Cuts stored content down to roughly `maxLength` visible characters
// without ever splitting a token: a mention counts as its "@Name", an image
// counts as nothing (it isn't text) and is kept only if it comes before the
// cut, and plain text is cut at a word boundary. Returns content still in
// the stored token format, so RichContent renders it the normal way.
export function excerptRichContent(content: string, maxLength: number): { content: string; truncated: boolean } {
  let budget = maxLength;
  let output = '';
  for (const segment of content.split(IMAGE_TOKEN)) {
    if (IMAGE_TOKEN_EXACT.test(segment)) {
      output += segment;
      continue;
    }
    for (const part of segment.split(MENTION_TOKEN)) {
      const mention = MENTION_TOKEN_EXACT.exec(part);
      const visibleLength = mention ? mention[1].length + 1 : part.length;
      if (visibleLength <= budget) {
        output += part;
        budget -= visibleLength;
        continue;
      }
      if (!mention) {
        const cut = part.slice(0, budget);
        const lastSpace = cut.lastIndexOf(' ');
        output += lastSpace > budget * 0.6 ? cut.slice(0, lastSpace) : cut;
      }
      return { content: `${output.trimEnd()}…`, truncated: true };
    }
  }
  return { content, truncated: false };
}

type RichContentProps = {
  content: string;
  className?: string;
  /** Show only about this many characters of text, then "…" and (with
   * moreHref) a "Read more" link — for feed/list previews of a post whose
   * full text lives on its own page. */
  maxLength?: number;
  moreHref?: string;
};

// Renders a journal entry / discussion / comment body: plain text with
// @[Name](uid) mention tokens turned into profile links, and ![alt](url)
// markdown image tokens turned into actual inline <img>s — both written by
// CommentComposer/ProjectJournalComposer, never raw text a viewer would see
// as literal markdown syntax.
export function RichContent({ content: fullContent, className, maxLength, moreHref }: RichContentProps) {
  if (!fullContent) return null;

  const { content, truncated } =
    maxLength === undefined ? { content: fullContent, truncated: false } : excerptRichContent(fullContent, maxLength);
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
      {truncated && moreHref && (
        <Link
          href={moreHref}
          className="self-start rounded-pill text-sm font-medium text-deep-fresh hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
        >
          Read more
        </Link>
      )}
    </div>
  );
}
