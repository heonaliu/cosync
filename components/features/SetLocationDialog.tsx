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
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';

type SetLocationDialogProps = {
  trigger: React.ReactNode;
  onSaved: (location: string) => void;
};

// Deliberately a plain city/area text field, not the Places-autocomplete +
// lat/lng flow AddOpportunityDialog uses for opportunity venues —
// CLAUDE.md's safety rules bar storing a user's precise location, so there's
// no lat/lng to capture here, just a coarse string good enough for Home's
// Nearby tab to text-match against opportunity.location.
export function SetLocationDialog({ trigger, onSaved }: SetLocationDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(): Promise<void> {
    if (!user || !location.trim()) return;
    setIsSaving(true);
    try {
      // setDoc + merge, not updateDoc — most accounts don't have a
      // users/{uid} root doc yet (today only the onboarding-answers subdoc
      // gets written), so updateDoc here would throw "no document to
      // update" for exactly the people this dialog exists for.
      await setDoc(doc(db, 'users', user.uid), { location: location.trim() }, { merge: true });
      setOpen(false);
      onSaved(location.trim());
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add your location</DialogTitle>
          <DialogDescription>
            Just a city or area, not an exact address — this powers the Nearby tab.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-location" className="text-sm text-ink">
            City or area
          </label>
          <Input
            id="profile-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g. Seattle, WA"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" disabled={isSaving || !location.trim()} onClick={() => void handleSave()}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
