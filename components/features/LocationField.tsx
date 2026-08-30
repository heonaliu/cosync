'use client';

import { IconMapPin } from '@tabler/icons-react';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';

import { AddressAutocompleteInput } from '@/components/features/AddressAutocompleteInput';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';

export type SavedLocation = { location: string; lat: number; lng: number };

type LocationFieldProps = {
  currentLocation: string | null;
  onSaved: (result: SavedLocation) => void;
};

// Inline, not a dialog — clicking "Change" (or "Add your location" when
// nothing's set yet) swaps this row for a Places search box in place,
// instead of opening a popup over the page. Restricted to '(cities)' — see
// lib/location.ts's getDistanceMiles for why the viewer's own point is a
// city-level geocode, never a precise address. Selecting a suggestion saves
// immediately; there's no separate Save step since there's no modal to
// close and confirm.
export function LocationField({ currentLocation, onSaved }: LocationFieldProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [draftLocation, setDraftLocation] = useState(currentLocation ?? '');
  const [isSaving, setIsSaving] = useState(false);

  async function handleAddressSelected(address: string, lat: number, lng: number): Promise<void> {
    if (!user) return;
    setDraftLocation(address);
    setIsSaving(true);
    try {
      // setDoc + merge, not updateDoc — most accounts don't have a
      // users/{uid} root doc yet (today only the onboarding-answers subdoc
      // gets written), so updateDoc here would throw "no document to
      // update" for exactly the people this field exists for.
      await setDoc(doc(db, 'users', user.uid), { location: address, locationLat: lat, locationLng: lng }, { merge: true });
      onSaved({ location: address, lat, lng });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  // Seeds the draft from the current value at the moment editing starts,
  // rather than once at mount — this component renders before the async
  // getUserInfo() fetch resolves, so a useState lazy initializer keyed off
  // currentLocation would lock the draft to '' forever even after the real
  // value arrives (the exact race already found and fixed in useRsvp.ts
  // etc. this session — same bug, same fix, applied here from the start).
  function handleChangeClick(): void {
    setDraftLocation(currentLocation ?? '');
    setIsEditing(true);
  }

  function handleCancel(): void {
    setDraftLocation(currentLocation ?? '');
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <AddressAutocompleteInput
          defaultValue={draftLocation}
          placeholder="e.g. Seattle, WA"
          types={['(cities)']}
          onChange={setDraftLocation}
          onAddressSelected={({ address, lat, lng }) => void handleAddressSelected(address, lat, lng)}
        />
        <Button type="button" variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    );
  }

  if (currentLocation) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-oak">
          <IconMapPin className="size-4 text-deep-fresh" aria-hidden="true" />
          Near <span className="font-medium text-ink">{currentLocation}</span>
        </span>
        <Button type="button" variant="outline" size="sm" onClick={handleChangeClick}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <Button type="button" size="sm" onClick={handleChangeClick}>
      Add your location
    </Button>
  );
}
