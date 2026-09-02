'use client';

import { doc, setDoc } from 'firebase/firestore';
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
import { db } from '@/lib/firebase';
import { PROJECT_CATEGORY_TAGS } from '@/lib/tags';

const BIO_MAX_LENGTH = 280;

type EditProfileDialogProps = {
  uid: string;
  currentDisplayName: string;
  currentInterests: string[];
  currentBio: string;
  trigger: React.ReactNode;
  onSaved: (updated: { displayName: string; interests: string[]; bio: string }) => void;
};

// Shared by the header's "Edit" button and the Interests section itself
// (clicking either opens this same dialog) — one editor for both fields
// instead of two separate flows that could drift apart.
export function EditProfileDialog({
  uid,
  currentDisplayName,
  currentInterests,
  currentBio,
  trigger,
  onSaved,
}: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [bio, setBio] = useState(currentBio);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(currentInterests);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom tags this person already has that aren't one of the base
  // category pills — shown as their own toggleable pills too, rather than
  // silently dropped the next time this dialog opens.
  const customTags = currentInterests.filter((tag) => !(PROJECT_CATEGORY_TAGS as readonly string[]).includes(tag));

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen);
    if (nextOpen) {
      // Re-seed from the live props at the moment editing starts, not just
      // at mount — same async-prop-race fix used throughout this app (see
      // LocationField) since the parent's own fetch can resolve after this
      // dialog has already mounted once.
      setDisplayName(currentDisplayName);
      setSelectedInterests(currentInterests);
      setBio(currentBio);
      setError(null);
    }
  }

  function toggleInterest(tag: string): void {
    setSelectedInterests((previous) =>
      previous.includes(tag) ? previous.filter((item) => item !== tag) : [...previous, tag]
    );
  }

  function addCustomTag(): void {
    const tag = customTagInput.trim();
    if (!tag) return;
    setSelectedInterests((previous) => (previous.includes(tag) ? previous : [...previous, tag]));
    setCustomTagInput('');
  }

  const canSave = displayName.trim().length > 0;

  async function handleSave(): Promise<void> {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      const trimmedName = displayName.trim();
      const trimmedBio = bio.trim();
      await setDoc(
        doc(db, 'users', uid),
        { displayName: trimmedName, interests: selectedInterests, bio: trimmedBio },
        { merge: true }
      );
      onSaved({ displayName: trimmedName, interests: selectedInterests, bio: trimmedBio });
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Your profile photo stays synced from Google.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-profile-name" className="text-sm text-ink">
              Display name
            </label>
            <Input id="edit-profile-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-profile-bio" className="text-sm text-ink">
              Bio <span className="text-sand">(optional)</span>
            </label>
            <Textarea
              id="edit-profile-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value.slice(0, BIO_MAX_LENGTH))}
              placeholder="A couple sentences about what you're into or working on."
              className="min-h-20"
            />
            <span className="self-end text-xs text-sand">
              {bio.length}/{BIO_MAX_LENGTH}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm text-ink">Interests</span>
            <div className="flex flex-wrap gap-2">
              {[...PROJECT_CATEGORY_TAGS, ...customTags].map((tag) => (
                <PillToggle
                  key={tag}
                  label={tag}
                  isActive={selectedInterests.includes(tag)}
                  activeColor="purple"
                  onClick={() => toggleInterest(tag)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={customTagInput}
                onChange={(event) => setCustomTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder="Add your own"
                className="max-w-48"
                aria-label="Add your own interest"
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomTag}>
                Add
              </Button>
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
