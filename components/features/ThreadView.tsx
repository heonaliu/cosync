'use client';

import { IconHandStop, IconMessageCircle, IconPencil } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CommentComposer, type ReplyTarget } from '@/components/features/CommentComposer';
import { CommentList } from '@/components/features/CommentList';
import { RichContent } from '@/components/features/RichContent';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { getThreadData, listComments, updateThreadPost, type ThreadData } from '@/lib/thread';
import { formatRelativeTime } from '@/lib/time';
import type { Comment } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

type ThreadViewProps = {
  postId: string;
};

// undefined = still loading, null = the post doesn't exist, its id was
// malformed, or it isn't visible to this viewer (same fail-closed pattern
// as ProjectDetail/ClubDetail — a denied read throws, which the catch below
// folds into this same state).
export function ThreadView({ postId }: ThreadViewProps) {
  const { user } = useAuth();
  const [thread, setThread] = useState<ThreadData | null | undefined>(undefined);
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  function startEditing(): void {
    if (!thread) return;
    setEditContent(thread.content);
    setEditTitle(thread.title ?? '');
    setIsEditing(true);
  }

  async function handleSaveEdit(): Promise<void> {
    if (!thread || !editContent.trim()) return;
    setIsSaving(true);
    try {
      await updateThreadPost(thread.ref, {
        content: editContent.trim(),
        title: thread.title !== undefined ? editTitle.trim() : undefined,
      });
      setIsEditing(false);
      setReloadToken((token) => token + 1);
    } catch (error) {
      console.error('Failed to save edit:', error);
      toast.error('Could not save your edit. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (thread === undefined) {
    return <p className="text-sm text-sand">Loading thread…</p>;
  }
  if (thread === null) {
    return <p className="text-sm text-oak">This post doesn&apos;t exist or isn&apos;t visible to you.</p>;
  }

  const isAuthor = Boolean(user && user.uid === thread.authorUid);

  return (
    <div className="flex flex-col gap-6">
      <Link href={thread.backHref} className="text-sm text-oak hover:text-ink hover:underline">
        ← Back to {thread.backLabel}
      </Link>

      <Card padding="lg" className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
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
              <span className="text-xs text-sand">
                {formatRelativeTime(thread.createdAt)}
                {thread.editedAt && ' · edited'}
              </span>
            </div>
          </div>

          {isAuthor && !isEditing && (
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit post" onClick={startEditing}>
              <IconPencil className="size-4 text-sand" />
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-2">
            {thread.title !== undefined && (
              <Input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                placeholder="Title"
                aria-label="Edit title"
              />
            )}
            <Textarea
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              aria-label="Edit content"
              className="min-h-24"
              autoFocus
            />
            <div className="flex items-center gap-2 self-end">
              <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSaving || !editContent.trim()}
                onClick={() => void handleSaveEdit()}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {thread.title && <h1 className="text-[22px] font-medium text-ink">{thread.title}</h1>}
            <RichContent content={thread.content} />
          </>
        )}

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
