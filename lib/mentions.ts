// @mention tokens are stored in comment content as `@[Full Name](uid)` —
// the same "markdown-ish tag with the real data embedded" convention as the
// `![alt](url)` image tags this app already uses, rather than trying to
// re-match a plain "@Full Name" string back to a uid at render time (which
// breaks the moment two people share a name, or a name contains an "@").
// See components/features/RichContent.tsx for the render side and
// components/features/CommentComposer.tsx for where these get inserted.
const MENTION_TOKEN = /@\[([^\]]+)\]\(([^)]+)\)/g;

export function toMentionToken(name: string, uid: string): string {
  return `@[${name}](${uid})`;
}

// Every uid actually mentioned in a comment's content, deduped — stored
// alongside the comment as `mentionedUids` so a future "who mentioned me"
// view doesn't need to re-parse every comment's text.
export function extractMentionedUids(content: string): string[] {
  const uids = new Set<string>();
  for (const match of content.matchAll(MENTION_TOKEN)) {
    uids.add(match[2]);
  }
  return Array.from(uids);
}

const IMAGE_TOKEN = /!\[[^\]]*\]\([^)]+\)/g;

// A short plain-text version of stored content, for places that can't
// render RichContent (notification excerpts): mention tokens collapse to
// "@Name", image tokens to "[photo]", whitespace runs to single spaces.
export function toPlainExcerpt(content: string, maxLength = 140): string {
  const plain = content
    .replace(MENTION_TOKEN, (_, name: string) => `@${name}`)
    .replace(IMAGE_TOKEN, '[photo]')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength - 1).trimEnd()}…` : plain;
}
