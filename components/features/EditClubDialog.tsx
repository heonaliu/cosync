'use client';

import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { toast } from 'sonner';

import { ClubAccessPicker } from '@/components/features/ClubAccessPicker';
import { ClubScopePicker } from '@/components/features/ClubScopePicker';
import { ClubTagPicker } from '@/components/features/ClubTagPicker';
import { SchoolInput } from '@/components/features/SchoolInput';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { db } from '@/lib/firebase';
import type { Club, ClubAccess, ClubScope } from '@/lib/types';

type EditClubDialogProps = {
  club: Club;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

// Admin-only, opened from the "Edit club" item in ClubHeader's ⋮ menu
// (controlled from there so the dialog outlives the menu closing). The
// clubs update rule gives admins full write.
export function EditClubDialog({ club, open, onOpenChange, onSaved }: EditClubDialogProps) {
  const [name, setName] = useState(club.name);
  const [about, setAbout] = useState(club.description);
  const [tags, setTags] = useState(club.tags);
  const [scope, setScope] = useState<ClubScope>(club.scope);
  const [customScope, setCustomScope] = useState(club.customScope ?? '');
  const [schoolName, setSchoolName] = useState(club.schoolName ?? '');
  const [access, setAccess] = useState<ClubAccess>(club.access);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean): void {
    if (nextOpen) {
      setName(club.name);
      setAbout(club.description);
      setTags(club.tags);
      setScope(club.scope);
      setCustomScope(club.customScope ?? '');
      setSchoolName(club.schoolName ?? '');
      setAccess(club.access);
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!name.trim() || !about.trim()) {
      setError('Club name and About are required.');
      return;
    }
    if (scope === 'other' && !customScope.trim()) {
      setError('Say where the club meets, or pick a different option.');
      return;
    }
    if (access === 'schoolOnly' && !schoolName.trim()) {
      setError('Add the school above for a school-only club, or pick a different "Who can join" option.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'clubs', club.id), {
        name: name.trim(),
        description: about.trim(),
        tags,
        scope,
        customScope: scope === 'other' ? customScope.trim() : deleteField(),
        schoolName: schoolName.trim().replace(/\s+/g, ' ') || deleteField(),
        access,
      });
      onOpenChange(false);
      onSaved();
      toast.success('Club updated.');
    } catch (saveError) {
      console.error('Failed to update club:', saveError);
      toast.error('Could not save your changes. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit club</DialogTitle>
          <DialogDescription>Only admins can change these.</DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-club-name" className="text-sm text-ink">
              Club name
            </label>
            <Input id="edit-club-name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-club-about" className="text-sm text-ink">
              About
            </label>
            <Textarea id="edit-club-about" value={about} onChange={(event) => setAbout(event.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Tags</span>
            <ClubTagPicker tags={tags} onChange={setTags} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-club-school" className="text-sm text-ink">
              School <span className="text-sand">(if applicable)</span>
            </label>
            <SchoolInput id="edit-club-school" value={schoolName} onChange={setSchoolName} />
            <p className="text-xs text-sand">
              {access === 'schoolOnly'
                ? 'Only students whose profile lists this exact school can find and join without a code — pick it from the suggestions if it’s there.'
                : 'Pick from the suggestions if your school is already on CoSync, so everyone uses the same name.'}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Who can join</span>
            <ClubAccessPicker access={access} schoolName={schoolName.trim() || null} onChange={setAccess} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Where does it meet</span>
            <ClubScopePicker
              scope={scope}
              customScope={customScope}
              onScopeChange={setScope}
              onCustomScopeChange={setCustomScope}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
