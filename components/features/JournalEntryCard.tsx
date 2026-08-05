'use client';

import { IconHandStop, IconMessageCircle, IconPaperclip } from '@tabler/icons-react';
import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { db } from '@/lib/firebase';
import { formatRelativeTime } from '@/lib/time';
import type { JournalEntry } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { useCheerJournalEntry } from '@/lib/useCheerJournalEntry';
import { cn } from '@/lib/utils';

type JournalEntryCardProps = {
  entry: JournalEntry;
  /** False when the current viewer is this project's owner — this product's
   * rule is that the person running their own project's build journal
   * doesn't cheer/comment on their own log, so the whole journal renders
   * counts-only for them regardless of which collaborator wrote which
   * entry. True for a collaborator or a viewer, on every entry. See
   * ProjectDetail for where this is computed. */
  showButtons: boolean;
};

export function JournalEntryCard({ entry, showButtons }: JournalEntryCardProps) {
  const { user } = useAuth();
  const { hasCheered, cheerCount, toggleCheer } = useCheerJournalEntry(entry);
  const [commentCount, setCommentCount] = useState(entry.commentCount);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  async function handleCheerClick(): Promise<void> {
    try {
      await toggleCheer();
    } catch (error) {
      console.error('Failed to cheer:', error);
      toast.error('Could not send that cheer. Try again.');
    }
  }

  async function handleSubmitReply(): Promise<void> {
    if (!user || !replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      await addDoc(collection(db, 'projects', entry.projectId, 'journalEntries', entry.id, 'comments'), {
        authorUid: user.uid,
        content: replyText.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'projects', entry.projectId, 'journalEntries', entry.id), {
        commentCount: increment(1),
      });
      setCommentCount((count) => count + 1);
      setReplyText('');
      setIsReplying(false);
    } catch (error) {
      console.error('Failed to post comment:', error);
      toast.error('Could not post that comment. Try again.');
    } finally {
      setIsSubmittingReply(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Avatar name={entry.authorName} size="sm" decorative />
        <span className="text-sm font-medium text-ink">{entry.authorName}</span>
        <span className="text-xs text-sand">{formatRelativeTime(entry.createdAt)}</span>
      </div>

      <p className="text-sm text-oak">{entry.content}</p>

      {entry.mediaUrls && entry.mediaUrls.length > 0 && (
        <div className="flex items-center gap-2 rounded-card border border-olive bg-cream px-3 py-2 text-xs text-oak">
          <IconPaperclip className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{entry.mediaUrls.join(' · ')}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        {showButtons && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={hasCheered}
              onClick={() => void handleCheerClick()}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
                hasCheered ? 'border-fresh bg-sage font-medium text-deep-fresh' : 'border-olive bg-white text-oak hover:bg-cream'
              )}
            >
              <IconHandStop className="size-4" aria-hidden="true" />
              Cheer
            </button>
            <button
              type="button"
              aria-pressed={isReplying}
              onClick={() => setIsReplying((open) => !open)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
                isReplying ? 'border-fresh bg-sage font-medium text-deep-fresh' : 'border-olive bg-white text-oak hover:bg-cream'
              )}
            >
              <IconMessageCircle className="size-4" aria-hidden="true" />
              Comment
            </button>
          </div>
        )}

        <span className="inline-flex items-center gap-3 text-sm text-oak">
          <span className="inline-flex items-center gap-1.5">
            <IconMessageCircle className="size-4" aria-hidden="true" />
            {commentCount} comment{commentCount === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconHandStop className="size-4" aria-hidden="true" />
            {cheerCount} cheer{cheerCount === 1 ? '' : 's'}
          </span>
        </span>
      </div>

      {isReplying && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleSubmitReply();
              }
            }}
            placeholder="Write a comment…"
            aria-label="Write a comment"
          />
          <Button type="button" size="sm" disabled={isSubmittingReply || !replyText.trim()} onClick={() => void handleSubmitReply()}>
            {isSubmittingReply ? 'Posting…' : 'Reply'}
          </Button>
        </div>
      )}
    </Card>
  );
}
