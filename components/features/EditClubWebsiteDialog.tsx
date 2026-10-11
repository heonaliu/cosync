'use client';

import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { toast } from 'sonner';

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
import type { Club } from '@/lib/types';

type EditClubWebsiteDialogProps = {
  club: Club;
  trigger: React.ReactNode;
  onSaved: () => void;
};

// Admin-only (the clubs update rule gives admins full write). Clearing the
// field removes the website rather than saving an empty string.
export function EditClubWebsiteDialog({ club, trigger, onSaved }: EditClubWebsiteDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function handleOpenChange(nextOpen: boolean): void {
    if (nextOpen) setUrl(club.websiteUrl ?? '');
    setOpen(nextOpen);
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    try {
      const trimmed = url.trim();
      await updateDoc(doc(db, 'clubs', club.id), { websiteUrl: trimmed || deleteField() });
      setOpen(false);
      onSaved();
    } catch (error) {
      console.error('Failed to save club website:', error);
      toast.error('Could not save the website. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Club website</DialogTitle>
          <DialogDescription>Link to your club&apos;s own site, if it has one. Leave it blank to remove it.</DialogDescription>
        </DialogHeader>

        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
          aria-label="Club website URL"
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
