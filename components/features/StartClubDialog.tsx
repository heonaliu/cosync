'use client';

import { IconLock, IconSchool, IconWorld } from '@tabler/icons-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ClubBadge } from '@/components/features/ClubBadge';
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
import { accentClasses } from '@/lib/color';
import { CLUB_COLOR_OPTIONS, CLUB_ICON_OPTIONS } from '@/lib/clubIcons';
import { db } from '@/lib/firebase';
import { getUserInfo } from '@/lib/queries';
import type { ClubAccess, ClubColorName, ClubIconName, ClubScope } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

const TAG_OPTIONS = ['Hardware', 'Robotics', 'AI', 'Writing', 'Music'];

const ACCESS_OPTIONS: {
  value: ClubAccess;
  icon: React.ComponentType<{ className?: string }>;
  title: (schoolName: string | null) => string;
  description: (schoolName: string | null) => string;
}[] = [
  {
    value: 'schoolOnly',
    icon: IconSchool,
    title: (schoolName) => (schoolName ? `${schoolName} students only` : 'Students at my school only'),
    description: (schoolName) =>
      schoolName ? `Verified ${schoolName} students can join freely` : 'Verified students at your school can join freely',
  },
  {
    value: 'anyone',
    icon: IconWorld,
    title: () => 'Anyone',
    description: () => 'Any CoSync student can join',
  },
  {
    value: 'invite',
    icon: IconLock,
    title: () => 'By invite only',
    description: () => 'You approve each request',
  },
];

type FormState = {
  name: string;
  about: string;
  iconName: ClubIconName;
  colorName: ClubColorName;
  tags: string[];
  scope: ClubScope;
  access: ClubAccess;
};

const EMPTY_FORM: FormState = {
  name: '',
  about: '',
  iconName: 'cpu',
  colorName: 'sky',
  tags: [],
  scope: 'online',
  access: 'anyone',
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
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
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

  function toggleTag(tag: string): void {
    setForm((previous) => ({
      ...previous,
      tags: previous.tags.includes(tag) ? previous.tags.filter((item) => item !== tag) : [...previous.tags, tag],
    }));
  }

  function addCustomTag(): void {
    const tag = customTagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm((previous) => ({ ...previous, tags: [...previous.tags, tag] }));
    }
    setCustomTagInput('');
    setShowCustomTagInput(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user) return;

    if (!form.name.trim() || !form.about.trim()) {
      setError('Club name and About are required.');
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
      if (form.scope === 'school' && schoolName) payload.schoolName = schoolName;

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
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <PillToggle
                  key={tag}
                  label={tag}
                  isActive={form.tags.includes(tag)}
                  activeColor="purple"
                  onClick={() => toggleTag(tag)}
                />
              ))}
              {form.tags
                .filter((tag) => !TAG_OPTIONS.includes(tag))
                .map((tag) => (
                  <PillToggle key={tag} label={tag} isActive activeColor="purple" onClick={() => toggleTag(tag)} />
                ))}
              {showCustomTagInput ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    autoFocus
                    value={customTagInput}
                    onChange={(event) => setCustomTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addCustomTag();
                      }
                    }}
                    onBlur={addCustomTag}
                    placeholder="Tag name"
                    className="h-8 w-32"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomTagInput(true)}
                  className="rounded-pill border border-dashed border-olive px-4 py-2 text-sm text-oak hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
                >
                  + Custom
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Where does it meet</span>
            <div className="flex flex-wrap gap-2">
              {schoolName && (
                <PillToggle
                  label={schoolName}
                  isActive={form.scope === 'school'}
                  activeColor="purple"
                  onClick={() => updateField('scope', 'school')}
                />
              )}
              <PillToggle
                label="Online"
                isActive={form.scope === 'online'}
                activeColor="purple"
                onClick={() => updateField('scope', 'online')}
              />
              <PillToggle
                label="Hybrid"
                isActive={form.scope === 'hybrid'}
                activeColor="purple"
                onClick={() => updateField('scope', 'hybrid')}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink">Who can join</span>
            <div className="flex flex-col gap-2">
              {ACCESS_OPTIONS.map((option) => {
                const isSelected = form.access === option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => updateField('access', option.value)}
                    className={cn(
                      'flex items-center gap-3 rounded-card border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
                      isSelected ? 'border-2 border-fresh bg-white' : 'border-olive bg-white hover:bg-cream'
                    )}
                  >
                    <Icon className="size-5 shrink-0 text-deep-fresh" aria-hidden="true" />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-ink">{option.title(schoolName)}</span>
                      <span className="text-xs text-oak">{option.description(schoolName)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
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
