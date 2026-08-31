'use client';

import { IconHandStop, IconMessageCircle } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CommentComposer, type ReplyTarget } from '@/components/features/CommentComposer';
import { CommentList } from '@/components/features/CommentList';
import { RichContent } from '@/components/features/RichContent';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { formatRelativeTime } from '@/lib/time';
import { getThreadData, listComments, type ThreadData } from '@/lib/thread';
import type { Comment } from '@/lib/types';

type ThreadViewProps = {
  postId: string;
};

// undefined = still loading, null = the post doesn't exist, its id was
// malformed, or it isn't visible to this viewer (same fail-closed pattern
// as ProjectDetail/ClubDetail — a denied read throws, which the catch below
// folds into this same state).
export function ThreadView({ postId }: ThreadViewProps) {
  const [thread, setThread] = useState<ThreadData | null | undefined>(undefined);
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const fetchedThread = await getThreadData(postId);
      if (!fetchedThread) {
        if (!cancelled) setThread(null);
        return;
      }
      const fetchedComments = await listComments(fetchedThread.ref);
      if (!cancelled) {
        setThread(fetchedThread);
        setComments(fetchedComments);
      }
    }

    load().catch((error: unknown) => {
      console.error('Failed to load thread:', error);
      if (!cancelled) setThread(null);
    });

    return () => {
      cancelled = true;
    };
  }, [postId, reloadToken]);

  if (thread === undefined) {
    return <p className="text-sm text-sand">Loading thread…</p>;
  }
  if (thread === null) {
    return <p className="text-sm text-oak">This post doesn&apos;t exist or isn&apos;t visible to you.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href={thread.backHref} className="text-sm text-oak hover:text-ink hover:underline">
        ← Back to {thread.backLabel}
      </Link>

      <Card padding="lg" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/profile/${thread.authorUid}`}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
          >
            <Avatar name={thread.authorName} decorative />
          </Link>
          <div className="flex flex-col">
            <Link href={`/profile/${thread.authorUid}`} className="text-sm font-medium text-ink hover:underline">
              {thread.authorName}
            </Link>
            <span className="text-xs text-sand">{formatRelativeTime(thread.createdAt)}</span>
          </div>
        </div>

        {thread.title && <h1 className="text-[22px] font-medium text-ink">{thread.title}</h1>}
        <RichContent content={thread.content} />

        <div className="flex items-center gap-4 text-sm text-oak">
          <span className="inline-flex items-center gap-1.5">
            <IconHandStop className="size-4" aria-hidden="true" />
            {thread.cheerCount} cheer{thread.cheerCount === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconMessageCircle className="size-4" aria-hidden="true" />
            {comments.length} repl{comments.length === 1 ? 'y' : 'ies'}
          </span>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <CommentComposer
          threadRef={thread.ref}
          replyTarget={replyTarget}
          onClearReplyTarget={() => setReplyTarget(null)}
          onPosted={() => setReloadToken((token) => token + 1)}
        />
        <CommentList comments={comments} onReply={setReplyTarget} />
      </div>
    </div>
  );
}
