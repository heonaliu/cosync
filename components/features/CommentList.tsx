import { IconTrash } from '@tabler/icons-react';
import Link from 'next/link';

import { ReportButton } from '@/components/features/ReportButton';
import { RichContent } from '@/components/features/RichContent';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatRelativeTime } from '@/lib/time';
import type { Comment } from '@/lib/types';
import { cn } from '@/lib/utils';

type CommentListProps = {
  comments: Comment[];
  /** Encoded thread id (lib/thread.ts) — used as the report's sourceRef prefix. */
  threadId: string;
  viewerUid?: string;
  onReply: (target: { commentId: string; authorUid: string; authorName: string }) => void;
  onDelete: (commentId: string) => Promise<void>;
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
const RAIL_BORDER_CLASS: Record<(typeof RAIL_COLORS)[number], string> = {
  fresh: 'border-fresh',
  purple: 'border-purple',
  amber: 'border-amber',
  sky: 'border-sky',
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
export function CommentList({ comments, threadId, viewerUid, onReply, onDelete }: CommentListProps) {
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
            {/* Straight guide lines for every ancestor lane this reply
                passes through — depth - 1 of them, since the innermost one
                (this reply's direct parent) becomes the curved elbow below
                instead of a plain line. */}
            {Array.from({ length: Math.max(depth - 1, 0) }).map((_, level) => (
              <span key={level} aria-hidden="true" className="flex w-4 shrink-0 justify-center">
                <span className={cn('w-0.5 opacity-40', RAIL_LINE_CLASS[RAIL_COLORS[level % RAIL_COLORS.length]])} />
              </span>
            ))}
            {depth > 0 && (
              // The "merge" look: a vertical line down from the row's top,
              // curving into a horizontal stub that runs into the card —
              // the classic border + rounded-corner elbow trick (two
              // straight borders meeting at a radius reads as one smooth
              // curve), same idea as a git graph's branch curving into its
              // parent rather than a right-angle bend.
              <span aria-hidden="true" className="w-4 shrink-0 self-stretch">
                <span
                  className={cn(
                    'block h-1/2 w-full rounded-bl-2xl border-b-2 border-l-2 opacity-60',
                    RAIL_BORDER_CLASS[nodeColor]
                  )}
                />
              </span>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-card bg-white p-4">
              {comment.parentCommentId && comment.parentCommentAuthorName && (
                <p className="text-xs text-sand">
                  Replying to{' '}
                  {comment.parentCommentAuthorUid ? (
                    <Link href={`/profile/${comment.parentCommentAuthorUid}`} className="font-medium text-oak hover:underline">
                      @{comment.parentCommentAuthorName}
                    </Link>
                  ) : (
                    <span className="font-medium text-oak">@{comment.parentCommentAuthorName}</span>
                  )}
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

              {comment.deleted ? (
                <p className="text-sm text-sand italic">This comment was deleted.</p>
              ) : (
                <>
                  <RichContent content={comment.content} />

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => onReply({ commentId: comment.id, authorUid: comment.authorUid, authorName: comment.authorName })}
                      className="text-xs text-oak hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
                    >
                      Reply
                    </button>
                    {viewerUid === comment.authorUid ? (
                      <ConfirmDialog
                        trigger={
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs text-oak hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
                          >
                            <IconTrash className="size-3.5" aria-hidden="true" />
                            Delete
                          </button>
                        }
                        title="Delete this comment?"
                        description="Its text will be removed and replaced with “This comment was deleted.” Replies to it will stay."
                        confirmLabel="Delete"
                        onConfirm={() => onDelete(comment.id)}
                      />
                    ) : (
                      <ReportButton kind="comment" sourceRef={`${threadId}/${comment.id}`} label="comment" className="ml-auto" />
                    )}
                  </div>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
