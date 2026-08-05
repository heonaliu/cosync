'use client';

import { doc, updateDoc } from 'firebase/firestore';
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
import type { Project, ProjectStage, ProjectVisibility } from '@/lib/types';

type EditProjectDialogProps = {
  project: Project;
  trigger: React.ReactNode;
  onSaved: () => void;
};

const STAGE_OPTIONS: ProjectStage[] = ['idea', 'prototyping', 'shipping'];

// Owner-only (enforced by firestore.rules, not just by never being rendered
// for non-owners) — the header's "Edit project" action. Unlike
// EditEventDialog there's no delete here; deleting a project isn't part of
// this feature yet.
export function EditProjectDialog({ project, trigger, onSaved }: EditProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [pitch, setPitch] = useState(project.pitch);
  const [description, setDescription] = useState(project.description);
  const [tags, setTags] = useState<string[]>(project.tags);
  const [stage, setStage] = useState<ProjectStage>(project.stage);
  const [visibility, setVisibility] = useState<ProjectVisibility>(project.visibility);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = title.trim().length > 0 && pitch.trim().length > 0;

  function toggleTag(tag: string): void {
    setTags((previous) => (previous.includes(tag) ? previous.filter((item) => item !== tag) : [...previous, tag]));
  }

  async function handleSave(): Promise<void> {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        title: title.trim(),
        pitch: pitch.trim(),
        description: description.trim() || pitch.trim(),
        tags,
        stage,
        visibility,
      });
      setOpen(false);
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Something went wrong.');
    } finally {
      setIsSaving(false);
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>Update the details anyone sees on this project&apos;s page.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-project-title" className="text-sm text-ink">
              Title
            </label>
            <Input id="edit-project-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-project-pitch" className="text-sm text-ink">
              One-line pitch
            </label>
            <Input id="edit-project-pitch" value={pitch} onChange={(event) => setPitch(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-project-description" className="text-sm text-ink">
              Description
            </label>
            <Textarea
              id="edit-project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Tags</span>
            <div className="flex flex-wrap gap-2">
              {PROJECT_CATEGORY_TAGS.map((tag) => (
                <PillToggle
                  key={tag}
                  label={tag}
                  isActive={tags.includes(tag)}
                  activeColor="purple"
                  onClick={() => toggleTag(tag)}
                />
              ))}
              {tags
                .filter((tag) => !(PROJECT_CATEGORY_TAGS as readonly string[]).includes(tag))
                .map((tag) => (
                  <PillToggle key={tag} label={tag} isActive activeColor="purple" onClick={() => toggleTag(tag)} />
                ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Stage</span>
            <div className="flex flex-wrap gap-2">
              {STAGE_OPTIONS.map((option) => (
                <PillToggle
                  key={option}
                  label={STAGE_LABELS[option]}
                  isActive={stage === option}
                  activeColor="amber"
                  onClick={() => setStage(option)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Visibility</span>
            <div className="flex flex-wrap gap-2">
              <PillToggle label="Public" isActive={visibility === 'public'} onClick={() => setVisibility('public')} />
              <PillToggle
                label="Save as draft"
                isActive={visibility === 'draft'}
                onClick={() => setVisibility('draft')}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" disabled={isSaving || !canSave} onClick={() => void handleSave()}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
