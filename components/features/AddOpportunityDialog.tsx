'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
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
import { Textarea } from '@/components/ui/Textarea';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';
import type { OpportunityType } from '@/lib/types';

const TYPE_OPTIONS: { value: OpportunityType; label: string }[] = [
  { value: 'research', label: 'Research' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'competition', label: 'Competition' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'program', label: 'Program' },
];

type FormState = {
  title: string;
  type: OpportunityType;
  description: string;
  deadline: string;
  location: string;
  applicationUrl: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  type: 'research',
  description: '',
  deadline: '',
  location: '',
  applicationUrl: '',
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
        createdAt: serverTimestamp(),
      };
      if (form.deadline) payload.deadline = new Date(form.deadline);
      if (form.location.trim()) payload.location = form.location.trim();
      if (form.applicationUrl.trim()) payload.applicationUrl = form.applicationUrl.trim();

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
    >
      <DialogTrigger asChild>
        <Button size="lg" className="self-start">
          + Add opportunity
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
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
            <select
              id="opportunity-type"
              value={form.type}
              onChange={(event) => updateField('type', event.target.value as OpportunityType)}
              className="h-10 rounded-pill border border-olive bg-white px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-fresh"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
            <label htmlFor="opportunity-deadline" className="text-sm text-ink">
              Deadline <span className="text-sand">(optional — leave blank if rolling)</span>
            </label>
            <Input
              id="opportunity-deadline"
              type="date"
              value={form.deadline}
              onChange={(event) => updateField('deadline', event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="opportunity-location" className="text-sm text-ink">
              Location <span className="text-sand">(optional)</span>
            </label>
            <Input
              id="opportunity-location"
              placeholder="Online, or a city"
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
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
