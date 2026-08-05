'use client';

import { deleteDoc, deleteField, doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';

import { EventFields, type EventFormValues } from '@/components/features/EventFields';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
import type { Discussion } from '@/lib/types';

type EditEventDialogProps = {
  event: Discussion;
  trigger: React.ReactNode;
  onSaved: () => void;
  onDeleted: () => void;
};

function toDateInputValue(ms: number): string {
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(ms: number): string {
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Author-only (enforced by firestore.rules, not just by this component
// never being rendered for non-authors) — lets the person who created an
// event change its details, stop it from recurring (clear recurringDays),
// or delete it outright.
export function EditEventDialog({ event, trigger, onSaved, onDeleted }: EditEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [eventValues, setEventValues] = useState<EventFormValues>({
    eventDay: event.eventDate ? toDateInputValue(event.eventDate) : '',
    eventTime: event.eventDate ? toTimeInputValue(event.eventDate) : '',
    eventLocation: event.eventLocation ?? '',
    eventHost: event.eventHost ?? '',
    recurringDays: event.recurringDays ?? [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = title.trim().length > 0 && Boolean(eventValues.eventDay) && Boolean(eventValues.eventTime);

  async function handleSave(): Promise<void> {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        eventDate: new Date(`${eventValues.eventDay}T${eventValues.eventTime}`),
        // [] (not deleteField) — an empty selection is exactly what "stop
        // recurring" means; getNextEventOccurrence treats an empty array
        // the same as no field at all.
        recurringDays: eventValues.recurringDays,
        eventLocation: eventValues.eventLocation.trim() ? eventValues.eventLocation.trim() : deleteField(),
        eventHost: eventValues.eventHost.trim() ? eventValues.eventHost.trim() : deleteField(),
      };
      await updateDoc(doc(db, 'clubs', event.clubId, 'discussions', event.id), payload);
      setOpen(false);
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    await deleteDoc(doc(db, 'clubs', event.clubId, 'discussions', event.id));
    setOpen(false);
    onDeleted();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
      modal={false}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit event</DialogTitle>
          <DialogDescription>Update the details, stop it from recurring, or remove it entirely.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-event-name" className="text-sm text-ink">
              Event name
            </label>
            <Input id="edit-event-name" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <EventFields value={eventValues} onChange={setEventValues} />

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="sm:justify-between">
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" className="self-start text-destructive hover:text-destructive">
                Delete event
              </Button>
            }
            title="Delete this event?"
            description="This can't be undone."
            confirmLabel="Delete"
            onConfirm={handleDelete}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" disabled={isSaving || !canSave} onClick={() => void handleSave()}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
