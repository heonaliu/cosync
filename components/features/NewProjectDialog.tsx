'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { PillToggle } from '@/components/ui/PillToggle';
import { Textarea } from '@/components/ui/Textarea';
import { STAGE_LABELS } from '@/lib/color';
import { db } from '@/lib/firebase';
import { PROJECT_CATEGORY_TAGS } from '@/lib/tags';
import type { ProjectStage, ProjectVisibility } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';

type FormState = {
  title: string;
  pitch: string;
  description: string;
  tags: string[];
  stage: ProjectStage;
  visibility: ProjectVisibility;
};

const EMPTY_FORM: FormState = {
  title: '',
  pitch: '',
  description: '',
  tags: [],
  stage: 'idea',
  visibility: 'public',
};

const STAGE_OPTIONS: ProjectStage[] = ['idea', 'prototyping', 'shipping'];

const VISIBILITY_HINTS: Record<ProjectVisibility, string> = {
  public: 'Anyone can find and follow it — shown in Discover and feeds.',
  unlisted: 'Only visible with a direct link — never shown in Discover search or feeds.',
  private: 'Only visible to you and anyone you invite as a collaborator.',
};

type NewProjectDialogProps = {
  onCreated?: () => void;
};

export function NewProjectDialog({ onCreated }: NewProjectDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function toggleTag(tag: string): void {
    setForm((previous) => ({
      ...previous,
      tags: previous.tags.includes(tag) ? previous.tags.filter((item) => item !== tag) : [...previous.tags, tag],
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user) return;

    if (!form.title.trim() || !form.pitch.trim()) {
      setError('Title and a short pitch are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const ref = await addDoc(collection(db, 'projects'), {
        ownerUid: user.uid,
        title: form.title.trim(),
        pitch: form.pitch.trim(),
        description: form.description.trim() || form.pitch.trim(),
        tags: form.tags,
        stage: form.stage,
        visibility: form.visibility,
        memberUids: [user.uid],
        followerCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setForm(EMPTY_FORM);
      setOpen(false);
      onCreated?.();
      router.push(`/projects/${ref.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg">+ New project</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a new project</DialogTitle>
          <DialogDescription>
            Give it a title and a one-line pitch — you can fill in the rest from the project page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-title" className="text-sm text-ink">
              Title
            </label>
            <Input
              id="project-title"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-pitch" className="text-sm text-ink">
              One-line pitch
            </label>
            <Input
              id="project-pitch"
              value={form.pitch}
              onChange={(event) => updateField('pitch', event.target.value)}
              placeholder="What does it do, in one sentence?"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-description" className="text-sm text-ink">
              Description <span className="text-sand">(optional)</span>
            </label>
            <Textarea
              id="project-description"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="More detail for the project page — defaults to your pitch if left blank."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Tags</span>
            <div className="flex flex-wrap gap-2">
              {PROJECT_CATEGORY_TAGS.map((tag) => (
                <PillToggle
                  key={tag}
                  label={tag}
                  isActive={form.tags.includes(tag)}
                  activeColor="purple"
                  onClick={() => toggleTag(tag)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Stage</span>
            <div className="flex flex-wrap gap-2">
              {STAGE_OPTIONS.map((stage) => (
                <PillToggle
                  key={stage}
                  label={STAGE_LABELS[stage]}
                  isActive={form.stage === stage}
                  activeColor="amber"
                  onClick={() => updateField('stage', stage)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Visibility</span>
            <div className="flex flex-wrap gap-2">
              <PillToggle
                label="Public"
                isActive={form.visibility === 'public'}
                onClick={() => updateField('visibility', 'public')}
              />
              <PillToggle
                label="Unlisted"
                isActive={form.visibility === 'unlisted'}
                activeColor="amber"
                onClick={() => updateField('visibility', 'unlisted')}
              />
              <PillToggle
                label="Private"
                isActive={form.visibility === 'private'}
                activeColor="purple"
                onClick={() => updateField('visibility', 'private')}
              />
            </div>
            <p className="text-xs text-sand">{VISIBILITY_HINTS[form.visibility]}</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
