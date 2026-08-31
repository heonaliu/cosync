'use client';

import { IconPhoto, IconX } from '@tabler/icons-react';
import { doc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/Textarea';
import { getPastedImageFile, toImageMarkdown, uploadPostImage } from '@/lib/imageUpload';
import { extractMentionedUids, toMentionToken } from '@/lib/mentions';
import { searchUsersByPrefix, type UserInfo } from '@/lib/queries';
import { commentsCollection, postComment, type ThreadRef } from '@/lib/thread';
import { useAuth } from '@/lib/useAuth';

export type ReplyTarget = { commentId: string; authorName: string } | null;

type CommentComposerProps = {
  threadRef: ThreadRef;
  replyTarget: ReplyTarget;
  onClearReplyTarget: () => void;
  onPosted: () => void;
};

// How long to wait after the last keystroke before actually querying
// Firestore for mention matches — trades a little latency for firing far
// fewer queries than "one per keystroke" would (see this feature's
// write-up on searchUsersByPrefix for the full scale discussion).
const MENTION_SEARCH_DEBOUNCE_MS = 200;

export function CommentComposer({ threadRef, replyTarget, onClearReplyTarget, onPosted }: CommentComposerProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  // null = dropdown closed. Otherwise the text typed after the "@" so far.
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<UserInfo[]>([]);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTokenRef = useRef(0);

  // Pre-generated so a pasted/uploaded image has somewhere to live
  // (posts/{this id}/...) before the comment doc itself is written — see
  // lib/thread.ts's postComment, which setDoc()s onto this exact ref.
  const commentRefState = useRef(doc(commentsCollection(threadRef)));

  const canSubmit = content.trim().length > 0 && !isUploadingImage;

  function detectMention(value: string, cursor: number): void {
    const uptoCursor = value.slice(0, cursor);
    const atIndex = uptoCursor.lastIndexOf('@');
    if (atIndex === -1) {
      setMentionQuery(null);
      return;
    }
    const afterAt = uptoCursor.slice(atIndex + 1);
    // A space/newline or a "]" (an already-inserted mention token) between
    // the "@" and the cursor means we've moved past that mention.
    if (/[\s\]]/.test(afterAt)) {
      setMentionQuery(null);
      return;
    }
    setMentionStart(atIndex);
    setMentionQuery(afterAt);
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    const value = event.target.value;
    setContent(value);
    detectMention(value, event.target.selectionStart ?? value.length);
  }

  useEffect(() => {
    if (mentionQuery === null) {
      setMentionResults([]);
      return;
    }
    const token = ++searchTokenRef.current;
    const timer = setTimeout(() => {
      searchUsersByPrefix(mentionQuery, 5)
        .then((results) => {
          if (searchTokenRef.current === token) setMentionResults(results);
        })
        .catch((error: unknown) => console.error('Mention search failed:', error));
    }, MENTION_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  function selectMention(candidate: UserInfo): void {
    if (mentionStart === null) return;
    const cursor = textareaRef.current?.selectionStart ?? content.length;
    const before = content.slice(0, mentionStart);
    const after = content.slice(cursor);
    const token = toMentionToken(candidate.name, candidate.uid);
    setContent(`${before}${token} ${after}`);
    setMentionQuery(null);
    setMentionStart(null);
    requestAnimationFrame(() => {
      const nextCursor = before.length + token.length + 1;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  async function uploadAndInsert(file: File): Promise<void> {
    setIsUploadingImage(true);
    try {
      const url = await uploadPostImage(commentRefState.current.id, file);
      setContent((previous) => `${previous}${previous.trim() ? '\n' : ''}${toImageMarkdown(url, file.name)}\n`);
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Could not upload that image. Try again.');
    } finally {
      setIsUploadingImage(false);
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>): void {
    const image = getPastedImageFile(event);
    if (!image) return;
    event.preventDefault();
    void uploadAndInsert(image);
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void uploadAndInsert(file);
  }

  async function handleSubmit(): Promise<void> {
    if (!user || !canSubmit) return;
    setIsPosting(true);
    try {
      await postComment(threadRef, commentRefState.current, {
        authorUid: user.uid,
        authorName: user.displayName ?? 'Someone',
        content: content.trim(),
        mentionedUids: extractMentionedUids(content),
        parentCommentId: replyTarget?.commentId,
        parentCommentAuthorName: replyTarget?.authorName,
      });
      setContent('');
      commentRefState.current = doc(commentsCollection(threadRef));
      onClearReplyTarget();
      onPosted();
    } catch (error) {
      console.error('Failed to post comment:', error);
      toast.error('Could not post that comment. Try again.');
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-card bg-sage p-4">
      <div className="flex items-center gap-2">
        <Avatar name={user?.displayName ?? user?.email ?? 'You'} size="sm" decorative />
        {replyTarget ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-oak">
            Replying to <span className="font-medium text-ink">@{replyTarget.authorName}</span>
            <button
              type="button"
              onClick={onClearReplyTarget}
              aria-label="Cancel reply"
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
            >
              <IconX className="size-3.5 text-sand" aria-hidden="true" />
            </button>
          </span>
        ) : (
          <span className="text-sm font-medium text-ink">Add a comment</span>
        )}
      </div>

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder="Write a comment… type @ to mention someone"
          aria-label="Write a comment"
          className="min-h-20"
        />

        {mentionQuery !== null && mentionResults.length > 0 && (
          <ul className="absolute top-full left-0 z-10 mt-1 w-56 overflow-hidden rounded-card border border-olive bg-white shadow-sm">
            {mentionResults.map((candidate) => (
              <li key={candidate.uid}>
                <button
                  type="button"
                  onClick={() => selectMention(candidate)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-cream focus-visible:bg-cream focus-visible:outline-none"
                >
                  <Avatar name={candidate.name} size="sm" decorative />
                  {candidate.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isUploadingImage && <p className="text-xs text-sand">Uploading image…</p>}

      <div className="flex items-center justify-between gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <IconPhoto className="size-4" aria-hidden="true" />
          Image
        </Button>
        <Button type="button" size="sm" disabled={isPosting || !canSubmit} onClick={() => void handleSubmit()}>
          {isPosting ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </div>
  );
}
