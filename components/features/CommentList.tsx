import Link from 'next/link';

import { RichContent } from '@/components/features/RichContent';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/lib/time';
import type { Comment } from '@/lib/types';
import { cn } from '@/lib/utils';

type CommentListProps = {
  comments: Comment[];
  onReply: (target: { commentId: string; authorName: string }) => void;
};

// Rotates by depth, same "fixed palette, cycle by index" idea as a git
// graph's branch colors — a reply-to-a-reply-to-a-reply reads as a
// distinctly colored lane, not just "further indented."
const RAIL_COLORS = ['fresh', 'purple', 'amber', 'sky'] as const;
const RAIL_LINE_CLASS: Record<(typeof RAIL_COLORS)[number], string> = {
  fresh: 'bg-fresh',
  purple: 'bg-purple',
  amber: 'bg-amber',
  sky: 'bg-sky',
};

// How many parentCommentId hops back to the original post — a top-level
// reply is depth 0, a reply to that reply is depth 1, and so on. Guards
// against a cyclical/malformed parent chain with both a seen-set and a hard
// depth cap, since this walks live data rather than a validated tree.
function computeDepth(comment: Comment, byId: Map<string, Comment>): number {
  let depth = 0;
  let current = comment;
  const seen = new Set<string>();
  while (current.parentCommentId) {
    const parent = byId.get(current.parentCommentId);
    if (!parent || seen.has(current.id) || depth >= 12) break;
    seen.add(current.id);
    current = parent;
    depth += 1;
  }
  return depth;
}

// Flat chronological order (oldest first) — same Reddit-style "nested but
// flattened" list as before, now with a git-log-graph rail down the left
// showing how deep each reply is, in addition to the "Replying to @X" text
// (the rail shows depth; the text disambiguates *which* sibling at that
// depth, which color/indent alone can't).
export function CommentList({ comments, onReply }: CommentListProps) {
  if (comments.length === 0) {
    return <p className="text-sm text-oak">No replies yet — be the first to say something.</p>;
  }

  const byId = new Map(comments.map((comment) => [comment.id, comment]));

  return (
    <ul className="flex flex-col gap-1">
      {comments.map((comment) => {
        const depth = computeDepth(comment, byId);
        const nodeColor = RAIL_COLORS[depth % RAIL_COLORS.length];

        return (
          <li key={comment.id} className="flex">
            {Array.from({ length: depth }).map((_, level) => (
              <span key={level} aria-hidden="true" className="flex w-4 shrink-0 justify-center">
                <span className={cn('w-0.5 opacity-40', RAIL_LINE_CLASS[RAIL_COLORS[level % RAIL_COLORS.length]])} />
              </span>
            ))}
            <span aria-hidden="true" className="flex w-4 shrink-0 flex-col items-center">
              <span className={cn('w-0.5 flex-1', RAIL_LINE_CLASS[nodeColor])} />
              <span className={cn('size-2.5 shrink-0 rounded-full', RAIL_LINE_CLASS[nodeColor])} />
              <span className={cn('w-0.5 flex-1', RAIL_LINE_CLASS[nodeColor])} />
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-card bg-white p-4">
              {comment.parentCommentId && comment.parentCommentAuthorName && (
                <p className="text-xs text-sand">
                  Replying to <span className="font-medium text-oak">@{comment.parentCommentAuthorName}</span>
                </p>
              )}

              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${comment.authorUid}`}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
                >
                  <Avatar name={comment.authorName} size="sm" decorative />
                </Link>
                <Link href={`/profile/${comment.authorUid}`} className="text-sm font-medium text-ink hover:underline">
                  {comment.authorName}
                </Link>
                <span className="text-xs text-sand">{formatRelativeTime(comment.createdAt)}</span>
              </div>

              <RichContent content={comment.content} />

              <button
                type="button"
                onClick={() => onReply({ commentId: comment.id, authorName: comment.authorName })}
                className="self-start text-xs text-oak hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
              >
                Reply
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
