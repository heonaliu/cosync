'use client';

import { deleteField, doc, updateDoc } from 'firebase/firestore';
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
import { db } from '@/lib/firebase';
import type { Project } from '@/lib/types';

type EditLookingForDialogProps = {
  project: Project;
  trigger: React.ReactNode;
  onSaved: () => void;
};

// Owner-only. "Clear" removes the callout entirely (deleteField, not an
// empty string) rather than leaving a blank amber box on the page.
export function EditLookingForDialog({ project, trigger, onSaved }: EditLookingForDialogProps) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(project.lookingFor?.role ?? '');
  const [description, setDescription] = useState(project.lookingFor?.description ?? '');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        lookingFor: role.trim() ? { role: role.trim(), description: description.trim() } : deleteField(),
      });
      setOpen(false);
      onSaved();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Looking for</DialogTitle>
          <DialogDescription>Let people know what kind of collaborator would help right now.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="looking-for-role" className="text-sm text-ink">
              Role
            </label>
            <Input
              id="looking-for-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="e.g. A CAD collaborator"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="looking-for-description" className="text-sm text-ink">
              Detail
            </label>
            <Input
              id="looking-for-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. Fusion 360 preferred"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="self-start text-destructive hover:text-destructive"
            onClick={() => {
              setRole('');
              setDescription('');
            }}
            disabled={!role && !description}
          >
            Clear
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
