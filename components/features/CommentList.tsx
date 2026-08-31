import Link from 'next/link';

import { RichContent } from '@/components/features/RichContent';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/lib/time';
import type { Comment } from '@/lib/types';

type CommentListProps = {
  comments: Comment[];
  onReply: (target: { commentId: string; authorName: string }) => void;
};

// Flat chronological order (oldest first), each comment showing who it was
// a direct reply to when it wasn't just a reply to the original post —
// Reddit's "nested but flattened" pattern without actually nesting the DOM,
// since a real indented tree gets unreadable fast in a narrow card layout.
export function CommentList({ comments, onReply }: CommentListProps) {
  if (comments.length === 0) {
    return <p className="text-sm text-oak">No replies yet — be the first to say something.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {comments.map((comment) => (
        <li key={comment.id} className="flex flex-col gap-2 rounded-card bg-white p-4">
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
        </li>
      ))}
    </ul>
  );
}
