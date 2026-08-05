'use client';

import { IconCode, IconPhoto, IconX } from '@tabler/icons-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { db } from '@/lib/firebase';
import type { Project } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

type ProjectJournalComposerProps = {
  project: Project;
  onPosted: () => void;
};

// "Photo"/"Code" don't do a real Storage upload (that needs the SafeSearch
// moderation pipeline CLAUDE.md requires for uploads, which is out of scope
// here) — they reveal a small inline input for a filename/URL to attach,
// same "+Custom" reveal pattern StartClubDialog uses for its tag input,
// rather than either a fake no-op button or a native window.prompt (which
// would block browser-automation testing).
export function ProjectJournalComposer({ project, onPosted }: ProjectJournalComposerProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachmentInput, setAttachmentInput] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const canSubmit = content.trim().length > 0;

  function addAttachment(): void {
    const value = attachmentInput.trim();
    if (value) setAttachments((previous) => [...previous, value]);
    setAttachmentInput('');
    setShowAttachmentInput(false);
  }

  function removeAttachment(index: number): void {
    setAttachments((previous) => previous.filter((_, i) => i !== index));
  }

  async function handlePublish(): Promise<void> {
    if (!user || !canSubmit) return;
    setIsPosting(true);
    try {
      const payload: Record<string, unknown> = {
        authorUid: user.uid,
        content: content.trim(),
        cheerCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
      };
      if (attachments.length > 0) payload.mediaUrls = attachments;

      await addDoc(collection(db, 'projects', project.id, 'journalEntries'), payload);

      setContent('');
      setAttachments([]);
      onPosted();
    } catch (error) {
      console.error('Failed to post update:', error);
      toast.error('Could not post that update. Try again.');
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-card bg-sage p-5">
      <div className="flex items-center gap-2">
        <Avatar name={user?.displayName ?? user?.email ?? 'You'} size="sm" decorative />
        <span className="text-sm font-medium text-ink">Post an update</span>
      </div>

      <p className="text-sm text-oak">What did you build this week? Even a photo of your workbench counts.</p>

      <Input
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Start writing…"
        aria-label="Update content"
      />

      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <li
              key={`${attachment}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-pill bg-white px-3 py-1 text-xs text-oak"
            >
              {attachment}
              <button
                type="button"
                aria-label={`Remove ${attachment}`}
                onClick={() => removeAttachment(index)}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
              >
                <IconX className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showAttachmentInput && (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            value={attachmentInput}
            onChange={(event) => setAttachmentInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addAttachment();
              }
            }}
            onBlur={addAttachment}
            placeholder="Filename or URL"
            className="h-8 max-w-56"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAttachmentInput(true)}>
            <IconPhoto className="size-4" aria-hidden="true" />
            Photo
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAttachmentInput(true)}>
            <IconCode className="size-4" aria-hidden="true" />
            Code
          </Button>
        </div>
        <Button type="button" disabled={isPosting || !canSubmit} onClick={() => void handlePublish()}>
          {isPosting ? 'Publishing…' : 'Publish'}
        </Button>
      </div>
    </div>
  );
}
