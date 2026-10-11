'use client';

import { IconPhoto } from '@tabler/icons-react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/Textarea';
import { db } from '@/lib/firebase';
import { getPastedImageFile, toImageMarkdown, uploadImage } from '@/lib/imageUpload';
import { publishToLandingFeed } from '@/lib/landingFeed';
import { getUserInfo } from '@/lib/queries';
import type { Project } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

type ProjectJournalComposerProps = {
  project: Project;
  onPosted: () => void;
};

// "Photo" does a real upload (see lib/imageUpload.ts — Cloudinary, not
// Firebase Storage) and inserts the result as an inline markdown image in
// `content`, rather than a separate attachment.
export function ProjectJournalComposer({ project, onPosted }: ProjectJournalComposerProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = content.trim().length > 0 && !isUploadingImage;

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

      const entryRef = await addDoc(collection(db, 'projects', project.id, 'journalEntries'), payload);

      // Public projects only — the signed-out landing page's activity strip
      // (lib/landingFeed.ts). Best-effort, same as the updatedAt bump below.
      if (project.visibility === 'public') {
        const uid = user.uid;
        const postedContent = content.trim();
        getUserInfo(uid)
          .then((info) =>
            publishToLandingFeed({
              entryId: entryRef.id,
              projectId: project.id,
              projectTitle: project.title,
              authorUid: uid,
              authorName: info.name,
              content: postedContent,
            })
          )
          .catch((error: unknown) => console.error('Failed to add update to the landing feed:', error));
      }

      // Keeps the project's updatedAt honest as "last real activity," not
      // just "last edited by the owner" — Home's quiet-project nudge
      // (HomeFeed) reads this field to decide whether to remind YOU
      // specifically to post an update, so it has to move every time
      // anyone actually posts one. Best-effort: a failure here shouldn't
      // block the journal entry that already saved successfully.
      updateDoc(doc(db, 'projects', project.id), { updatedAt: serverTimestamp() }).catch((error: unknown) => {
        console.error("Failed to bump project's updatedAt:", error);
      });

      setContent('');
      onPosted();
    } catch (error) {
      console.error('Failed to post update:', error);
      toast.error('Could not post that update. Try again.');
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div id="composer" className="flex scroll-mt-24 flex-col gap-3 rounded-card bg-sage p-5">
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <IconPhoto className="size-4" aria-hidden="true" />
            Photo
          </Button>
        </div>
        <Button type="button" disabled={isPosting || !canSubmit} onClick={() => void handlePublish()}>
          {isPosting ? 'Publishing…' : 'Publish'}
        </Button>
      </div>
    </div>
  );
}
