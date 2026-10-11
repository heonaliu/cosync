'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ClubAccessPicker } from '@/components/features/ClubAccessPicker';
import { ClubBadge } from '@/components/features/ClubBadge';
import { ClubScopePicker } from '@/components/features/ClubScopePicker';
import { ClubTagPicker } from '@/components/features/ClubTagPicker';
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
import { accentClasses } from '@/lib/color';
import { CLUB_COLOR_OPTIONS, CLUB_ICON_OPTIONS } from '@/lib/clubIcons';
import { db } from '@/lib/firebase';
import { getUserInfo } from '@/lib/queries';
import type { ClubAccess, ClubColorName, ClubIconName, ClubScope } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

type FormState = {
  name: string;
  about: string;
  iconName: ClubIconName;
  colorName: ClubColorName;
  tags: string[];
  scope: ClubScope;
  customScope: string;
  access: ClubAccess;
  websiteUrl: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  about: '',
  iconName: 'cpu',
  colorName: 'sky',
  tags: [],
  scope: 'online',
  customScope: '',
  access: 'anyone',
  websiteUrl: '',
};

type StartClubDialogProps = {
  onCreated?: () => void;
};

export function StartClubDialog({ onCreated }: StartClubDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserInfo(user.uid)
      .then((info) => setSchoolName(info.school))
      .catch((fetchError: unknown) => console.error('Failed to load school info:', fetchError));
  }, [user]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user) return;

    if (!form.name.trim() || !form.about.trim()) {
      setError('Club name and About are required.');
      return;
    }
    if (form.scope === 'other' && !form.customScope.trim()) {
      setError('Say where the club meets, or pick a different option.');
      return;
    }
    if (form.access === 'schoolOnly' && !schoolName) {
      setError('Add your school to your profile first, or pick a different "Who can join" option.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.about.trim(),
        iconName: form.iconName,
        colorName: form.colorName,
        tags: form.tags,
        scope: form.scope,
        access: form.access,
        adminUids: [user.uid],
        memberUids: [user.uid],
        memberCount: 1,
        createdAt: serverTimestamp(),
      };
      if (form.scope === 'other') payload.customScope = form.customScope.trim();
      // School-only clubs need the school recorded — it's what decides who
      // can see and join them.
      if (form.access === 'schoolOnly' && schoolName) payload.schoolName = schoolName;
      if (form.websiteUrl.trim()) payload.websiteUrl = form.websiteUrl.trim();

      const ref = await addDoc(collection(db, 'clubs'), payload);

      setForm(EMPTY_FORM);
      setOpen(false);
      onCreated?.();
      router.push(`/clubs/${ref.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const { bg: previewBg, text: previewText } = accentClasses(form.colorName);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
      modal={false}
    >
      <DialogTrigger asChild>
        <Button size="lg">+ Start a club</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a club</DialogTitle>
          <DialogDescription>Anyone can start a club. Give it a name, a vibe, and decide who&apos;s in.</DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="club-name" className="text-sm text-ink">
              Club name
            </label>
            <Input
              id="club-name"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="club-about" className="text-sm text-ink">
              About
            </label>
            <Textarea
              id="club-about"
              value={form.about}
              onChange={(event) => updateField('about', event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="club-website" className="text-sm text-ink">
              Website <span className="text-sand">(optional)</span>
            </label>
            <Input
              id="club-website"
              type="url"
              inputMode="url"
              value={form.websiteUrl}
              onChange={(event) => updateField('websiteUrl', event.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-ink">Badge</span>
              <ClubBadge iconName={form.iconName} colorName={form.colorName} size="lg" />
            </div>

            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-ink">Icon</span>
                <div className="flex flex-wrap gap-2">
                  {CLUB_ICON_OPTIONS.map(({ name, icon: Icon }) => {
                    const isSelected = form.iconName === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        aria-label={name}
                        aria-pressed={isSelected}
                        onClick={() => updateField('iconName', name)}
                        className={cn(
                          'flex size-10 items-center justify-center rounded-[10px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
                          isSelected ? cn('border-2', previewBg, previewText) : 'border-olive bg-white text-oak'
                        )}
                      >
                        <Icon className="size-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-ink">Color</span>
                <div className="flex flex-wrap gap-2">
                  {CLUB_COLOR_OPTIONS.map((color) => {
                    const { bg } = accentClasses(color);
                    const isSelected = form.colorName === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        aria-label={color}
                        aria-pressed={isSelected}
                        onClick={() => updateField('colorName', color)}
                        className={cn(
                          'size-8 rounded-full transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
                          bg,
                          isSelected ? 'ring-2 ring-offset-2 ring-ink' : ''
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Tags</span>
            <ClubTagPicker tags={form.tags} onChange={(tags) => updateField('tags', tags)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Where does it meet</span>
            <ClubScopePicker
              scope={form.scope}
              customScope={form.customScope}
              onScopeChange={(scope) => updateField('scope', scope)}
              onCustomScopeChange={(customScope) => updateField('customScope', customScope)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Who can join</span>
            <ClubAccessPicker access={form.access} schoolName={schoolName} onChange={(access) => updateField('access', access)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="sm:justify-between">
            <p className="self-center text-sm text-sand">You&apos;ll be the club&apos;s first admin</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create club'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
