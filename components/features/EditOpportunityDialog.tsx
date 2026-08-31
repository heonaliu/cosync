'use client';

import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';

import { AddressAutocompleteInput } from '@/components/features/AddressAutocompleteInput';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/DatePicker';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { OPPORTUNITY_STATUS_LABELS } from '@/lib/color';
import { db } from '@/lib/firebase';
import { formatDateInputValue, parseDateInputValue } from '@/lib/time';
import type { Opportunity, OpportunityStatus, OpportunityType } from '@/lib/types';

const TYPE_OPTIONS: { value: OpportunityType; label: string }[] = [
  { value: 'research', label: 'Research' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'competition', label: 'Competition' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'program', label: 'Program' },
];

const STATUS_OPTIONS: OpportunityStatus[] = ['rolling', 'ongoing', 'soon', 'passed'];

type EditOpportunityDialogProps = {
  opportunity: Opportunity;
  trigger: React.ReactNode;
  onSaved: (updated: Opportunity) => void;
};

// Owner-only (enforced by firestore.rules — the opportunities update rule
// already lets the poster edit any field, unlike some other update rules in
// this app that restrict which fields a write can touch, so no rules change
// was needed for this). Lets the person who posted an opportunity change its
// specifications after the fact, including a status that wasn't answerable
// at creation time (e.g. moving from "opening soon" to "ongoing" once it
// actually opens).
export function EditOpportunityDialog({ opportunity, trigger, onSaved }: EditOpportunityDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(opportunity.title);
  const [type, setType] = useState<OpportunityType>(opportunity.type);
  const [description, setDescription] = useState(opportunity.description);
  const [status, setStatus] = useState<OpportunityStatus>(opportunity.status ?? 'rolling');
  const [openDate, setOpenDate] = useState(opportunity.openDate ? formatDateInputValue(new Date(opportunity.openDate)) : '');
  const [deadline, setDeadline] = useState(opportunity.deadline ? formatDateInputValue(new Date(opportunity.deadline)) : '');
  const [location, setLocation] = useState(opportunity.location ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    opportunity.lat !== undefined && opportunity.lng !== undefined
      ? { lat: opportunity.lat, lng: opportunity.lng }
      : null
  );
  const [applicationUrl, setApplicationUrl] = useState(opportunity.applicationUrl ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = title.trim().length > 0 && description.trim().length > 0 && (status !== 'soon' || openDate);

  async function handleSave(): Promise<void> {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        type,
        description: description.trim(),
        status,
        deadline: deadline ? parseDateInputValue(deadline) : deleteField(),
        location: location.trim() ? location.trim() : deleteField(),
        applicationUrl: applicationUrl.trim() ? applicationUrl.trim() : deleteField(),
        // status !== 'soon' clears openDate outright rather than leaving a
        // stale date behind once it no longer means anything.
        openDate: status === 'soon' && openDate ? parseDateInputValue(openDate) : deleteField(),
      };
      // Always set both together, never leave one stale: if the location
      // text was free-typed rather than picked from the dropdown (coords is
      // null even though location isn't empty), there's no verified point
      // for it — clearing lat/lng here is what stops the OLD address's
      // coordinates from silently surviving under new location text.
      if (location.trim() && coords) {
        payload.lat = coords.lat;
        payload.lng = coords.lng;
      } else {
        payload.lat = deleteField();
        payload.lng = deleteField();
      }

      await updateDoc(doc(db, 'opportunities', opportunity.id), payload);

      onSaved({
        ...opportunity,
        title: title.trim(),
        type,
        description: description.trim(),
        status,
        deadline: deadline ? parseDateInputValue(deadline).getTime() : undefined,
        location: location.trim() || undefined,
        lat: location.trim() ? coords?.lat : undefined,
        lng: location.trim() ? coords?.lng : undefined,
        applicationUrl: applicationUrl.trim() || undefined,
        openDate: status === 'soon' && openDate ? parseDateInputValue(openDate).getTime() : undefined,
      });
      setOpen(false);
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
      // Same fix as AddOpportunityDialog — see there for why modal={false}
      // plus the onInteractOutside guard below are both needed together.
      modal={false}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-md"
        onInteractOutside={(event) => {
          if ((event.target as HTMLElement).closest('.pac-container')) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit opportunity</DialogTitle>
          <DialogDescription>Update the specifications anyone sees on this listing.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-opportunity-title" className="text-sm text-ink">
              Title
            </label>
            <Input id="edit-opportunity-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-opportunity-type" className="text-sm text-ink">
              Type
            </label>
            <Select value={type} onValueChange={(value) => setType(value as OpportunityType)}>
              <SelectTrigger id="edit-opportunity-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-opportunity-description" className="text-sm text-ink">
              Description
            </label>
            <Textarea
              id="edit-opportunity-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Status</span>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <PillToggle
                  key={option}
                  label={OPPORTUNITY_STATUS_LABELS[option]}
                  isActive={status === option}
                  activeColor="purple"
                  onClick={() => setStatus(option)}
                />
              ))}
            </div>
          </div>

          {status === 'soon' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-opportunity-open-date" className="text-sm text-ink">
                Open date
              </label>
              <DatePicker id="edit-opportunity-open-date" value={openDate} onChange={setOpenDate} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-opportunity-deadline" className="text-sm text-ink">
              Deadline <span className="text-sand">(optional — leave blank if rolling)</span>
            </label>
            <DatePicker id="edit-opportunity-deadline" value={deadline} onChange={setDeadline} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-opportunity-location" className="text-sm text-ink">
              Location <span className="text-sand">(optional)</span>
            </label>
            <AddressAutocompleteInput
              id="edit-opportunity-location"
              placeholder="Online, or start typing an address"
              defaultValue={location}
              onChange={(value) => {
                setLocation(value);
                setCoords(null);
              }}
              onAddressSelected={({ address, lat, lng }) => {
                setLocation(address);
                setCoords({ lat, lng });
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-opportunity-url" className="text-sm text-ink">
              Application URL <span className="text-sand">(optional)</span>
            </label>
            <Input
              id="edit-opportunity-url"
              type="url"
              placeholder="https://…"
              value={applicationUrl}
              onChange={(event) => setApplicationUrl(event.target.value)}
            />
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
