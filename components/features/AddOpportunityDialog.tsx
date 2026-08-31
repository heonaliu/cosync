'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
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
import { parseDateInputValue } from '@/lib/time';
import { useAuth } from '@/lib/useAuth';
import type { OpportunityStatus, OpportunityType } from '@/lib/types';

const TYPE_OPTIONS: { value: OpportunityType; label: string }[] = [
  { value: 'research', label: 'Research' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'competition', label: 'Competition' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'program', label: 'Program' },
];

const STATUS_OPTIONS: OpportunityStatus[] = ['rolling', 'ongoing', 'soon', 'passed'];

type FormState = {
  title: string;
  type: OpportunityType;
  description: string;
  deadline: string;
  location: string;
  lat: number | null;
  lng: number | null;
  applicationUrl: string;
  status: OpportunityStatus;
  openDate: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  type: 'research',
  description: '',
  deadline: '',
  location: '',
  lat: null,
  lng: null,
  applicationUrl: '',
  status: 'rolling',
  openDate: '',
};

type AddOpportunityDialogProps = {
  onCreated?: () => void;
};

export function AddOpportunityDialog({ onCreated }: AddOpportunityDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user) return;

    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and description are required.');
      return;
    }
    if (form.status === 'soon' && !form.openDate) {
      setError('"Opening soon" needs an open date — pick when applications start.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // No `verified` field written here on purpose — org verification
      // isn't built yet, and this page never fakes that badge either.
      const payload: Record<string, unknown> = {
        posterUid: user.uid,
        posterName: user.displayName ?? 'Someone',
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        createdAt: serverTimestamp(),
      };
      if (form.deadline) payload.deadline = parseDateInputValue(form.deadline);
      if (form.location.trim()) payload.location = form.location.trim();
      if (form.lat !== null && form.lng !== null) {
        payload.lat = form.lat;
        payload.lng = form.lng;
      }
      if (form.applicationUrl.trim()) payload.applicationUrl = form.applicationUrl.trim();
      if (form.status === 'soon' && form.openDate) payload.openDate = parseDateInputValue(form.openDate);

      await addDoc(collection(db, 'opportunities'), payload);

      setForm(EMPTY_FORM);
      setOpen(false);
      onCreated?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Something went wrong. Try again.'
      );
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
      // modal={false} turns off Radix's focus-trap (FocusScope), not just
      // the outside-click-closes behavior the onInteractOutside guard below
      // already covers. The trap alone was enough to swallow clicks on the
      // Places dropdown even after the dialog stopped closing — it redirects
      // focus back into the dialog on any pointer interaction with an
      // element outside its DOM subtree, which cuts off Google's own
      // click-to-select handler on a suggestion mid-sequence.
      modal={false}
    >
      <DialogTrigger asChild>
        <Button size="lg" className="self-start">
          + Add opportunity
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-md"
        onInteractOutside={(event) => {
          // The Places dropdown is appended straight to <body> by Google's
          // own script, outside this dialog's DOM subtree — so Radix's
          // "outside click" detection sees a click on a suggestion as
          // outside the dialog and swallows it before Google's own
          // click-to-select handler runs. Telling Radix "this one doesn't
          // count" is what lets clicking a suggestion actually work (arrow
          // keys + Enter bypassed this entirely, which is why only clicking
          // was broken).
          if ((event.target as HTMLElement).closest('.pac-container')) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Add an opportunity</DialogTitle>
          <DialogDescription>
            Post a research role, hackathon, competition, mentorship, or program.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="opportunity-title" className="text-sm text-ink">
              Title
            </label>
            <Input
              id="opportunity-title"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="opportunity-type" className="text-sm text-ink">
              Type
            </label>
            <Select value={form.type} onValueChange={(value) => updateField('type', value as OpportunityType)}>
              <SelectTrigger id="opportunity-type">
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
            <label htmlFor="opportunity-description" className="text-sm text-ink">
              Description
            </label>
            <Textarea
              id="opportunity-description"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Status</span>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <PillToggle
                  key={option}
                  label={OPPORTUNITY_STATUS_LABELS[option]}
                  isActive={form.status === option}
                  activeColor="purple"
                  onClick={() => updateField('status', option)}
                />
              ))}
            </div>
          </div>

          {form.status === 'soon' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="opportunity-open-date" className="text-sm text-ink">
                Open date
              </label>
              <DatePicker id="opportunity-open-date" value={form.openDate} onChange={(next) => updateField('openDate', next)} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="opportunity-deadline" className="text-sm text-ink">
              Deadline <span className="text-sand">(optional — leave blank if rolling)</span>
            </label>
            <DatePicker id="opportunity-deadline" value={form.deadline} onChange={(next) => updateField('deadline', next)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="opportunity-location" className="text-sm text-ink">
              Location <span className="text-sand">(optional)</span>
            </label>
            <AddressAutocompleteInput
              id="opportunity-location"
              placeholder="Online, or start typing an address"
              defaultValue={form.location}
              onChange={(value) => {
                // Free typing invalidates any previously-selected coordinates
                // — only a fresh pick from the dropdown sets them again.
                setForm((previous) => ({ ...previous, location: value, lat: null, lng: null }));
              }}
              onAddressSelected={({ address, lat, lng }) => {
                setForm((previous) => ({ ...previous, location: address, lat, lng }));
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="opportunity-url" className="text-sm text-ink">
              Application URL <span className="text-sand">(optional)</span>
            </label>
            <Input
              id="opportunity-url"
              type="url"
              placeholder="https://…"
              value={form.applicationUrl}
              onChange={(event) => updateField('applicationUrl', event.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Posting…' : 'Post opportunity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
