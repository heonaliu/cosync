'use client';

import { IconCode, IconPhoto, IconX } from '@tabler/icons-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { db } from '@/lib/firebase';
import { getPastedImageFile, toImageMarkdown, uploadImage } from '@/lib/imageUpload';
import type { Project } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

type ProjectJournalComposerProps = {
  project: Project;
  onPosted: () => void;
};

// "Code" still doesn't do a real upload — it reveals a small inline input
// for a filename/URL to attach, same "+Custom" reveal pattern
// StartClubDialog uses for its tag input. "Photo" does a real upload now
// (see lib/imageUpload.ts — Cloudinary, not Firebase Storage) and inserts
// the result as an inline markdown image in `content`, rather than a
// separate attachment.
export function ProjectJournalComposer({ project, onPosted }: ProjectJournalComposerProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachmentInput, setAttachmentInput] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = content.trim().length > 0 && !isUploadingImage;

  function addAttachment(): void {
    const value = attachmentInput.trim();
    if (value) setAttachments((previous) => [...previous, value]);
    setAttachmentInput('');
    setShowAttachmentInput(false);
  }

  function removeAttachment(index: number): void {
    setAttachments((previous) => previous.filter((_, i) => i !== index));
  }

  async function uploadAndInsert(file: File): Promise<void> {
    setIsUploadingImage(true);
    try {
      const url = await uploadImage(file);
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
        // Denormalized copy of the parent project's visibility — see
        // getRecentJournalEntries' comment for why this needs to exist as
        // its own field rather than being looked up from the project doc.
        // A project's visibility can change later (EditProjectDialog) and
        // this copy won't follow — acceptable staleness for a "recent
        // activity" feed, matching CLAUDE.md's "denormalize where reads
        // dominate" guidance.
        projectVisibility: project.visibility,
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

      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onPaste={handlePaste}
        placeholder="Start writing… paste or attach a photo below"
        aria-label="Update content"
        className="min-h-20"
      />

      {isUploadingImage && <p className="text-xs text-sand">Uploading image…</p>}

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
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
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
