'use client';

import { IconBackpack, IconChalkboardTeacher, IconMail } from '@tabler/icons-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { PillToggle } from '@/components/ui/PillToggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { db } from '@/lib/firebase';
import { PROJECT_CATEGORY_TAGS } from '@/lib/tags';
import type { UserRole } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

// "Prefer not to say" first and pre-selected — the field is genuinely
// optional, and defaulting to the private option (rather than defaulting to
// an arbitrary named gender) is what makes that credible.
const GENDER_OPTIONS = ['Prefer not to say', 'Female', 'Male', 'Non-binary', 'Other'];

type OnboardingRole = Extract<UserRole, 'student' | 'educator'>;

export default function OnboardingPage() {
  const { user, status } = useAuth();
  const router = useRouter();

  // Role is its own step, ahead of everything else — it's a required
  // choice (unlike interests/gender, which stay skippable), so it isn't
  // folded into the same form as those.
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [role, setRole] = useState<OnboardingRole | null>(null);

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [gender, setGender] = useState(GENDER_OPTIONS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'anon') router.replace('/');
  }, [status, router]);

  function toggleInterest(tag: string): void {
    setSelectedInterests((previous) =>
      previous.includes(tag) ? previous.filter((item) => item !== tag) : [...previous, tag]
    );
  }

  function addCustomTag(): void {
    const tag = customTagInput.trim();
    if (!tag) return;
    setCustomTags((previous) => (previous.includes(tag) ? previous : [...previous, tag]));
    setSelectedInterests((previous) => (previous.includes(tag) ? previous : [...previous, tag]));
    setCustomTagInput('');
  }

  // Role has no manual verification system yet — an educator's account is
  // simply marked unverified until someone manually flips the flag after
  // they email proof of role. Written on both Skip and Continue below since
  // it was already answered on the previous step, not something either
  // button is meant to skip.
  function roleFields(): Record<string, unknown> {
    if (role === 'educator') return { role: 'educator', verified: false };
    if (role === 'student') return { role: 'student' };
    return {};
  }

  // "Skip" writes only the completion marker (plus role) — interests/gender
  // stay genuinely unanswered (not defaulted to empty/"prefer not to say"
  // values) so a skip is distinguishable later from someone who answered.
  async function handleSkip(): Promise<void> {
    if (!user) return;
    setIsSaving(true);
    setError(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { hasSeenTutorial: false, ...roleFields() }, { merge: true });
      await setDoc(
        doc(db, 'users', user.uid, 'private', 'profile'),
        { onboardedAt: serverTimestamp() },
        { merge: true }
      );
      router.push('/home');
    } catch (skipError) {
      setError(skipError instanceof Error ? skipError.message : 'Something went wrong.');
      setIsSaving(false);
    }
  }

  async function handleContinue(): Promise<void> {
    if (!user) return;
    setIsSaving(true);
    setError(null);
    try {
      // Interests are public (see profile page) so they live on the main
      // doc; gender and the completion marker stay on the owner-only path.
      // hasSeenTutorial: false (not just left unset) is what makes the
      // floating help button's tour auto-open once for a genuinely new
      // account — see lib/useTutorial.ts for why "unset" and "false" have
      // to mean different things here.
      await setDoc(
        doc(db, 'users', user.uid),
        { interests: selectedInterests, hasSeenTutorial: false, ...roleFields() },
        { merge: true }
      );
      await setDoc(
        doc(db, 'users', user.uid, 'private', 'profile'),
        { gender, onboardedAt: serverTimestamp() },
        { merge: true }
      );
      router.push('/home');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Something went wrong.');
      setIsSaving(false);
    }
  }

  if (step === 'role') {
    return (
      <PageContainer className="flex flex-col gap-8 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-[22px] font-medium text-ink">Are you a student or an educator?</h1>
          <p className="max-w-lg text-sm text-oak">This decides what you can post and how your account is labeled.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:max-w-lg">
          <button
            type="button"
            onClick={() => setRole('student')}
            aria-pressed={role === 'student'}
            className={cn(
              'flex flex-col items-start gap-3 rounded-card border-2 bg-white p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
              role === 'student' ? 'border-fresh' : 'border-olive hover:border-sand'
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-[12px] bg-sage">
              <IconBackpack className="size-5 text-deep-fresh" aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">Student</span>
              <span className="text-sm text-oak">Grades 6–12. Post projects, journal builds, join clubs.</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setRole('educator')}
            aria-pressed={role === 'educator'}
            className={cn(
              'flex flex-col items-start gap-3 rounded-card border-2 bg-white p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
              role === 'educator' ? 'border-fresh' : 'border-olive hover:border-sand'
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-[12px] bg-lilac">
              <IconChalkboardTeacher className="size-5 text-deep-purple" aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">Educator</span>
              <span className="text-sm text-oak">Post opportunities and mentor through public threads.</span>
            </span>
          </button>
        </div>

        {role === 'educator' && (
          <div className="flex max-w-lg items-start gap-3 rounded-card bg-amber/40 p-4">
            <IconMail className="mt-0.5 size-5 shrink-0 text-deep-amber" aria-hidden="true" />
            <p className="text-sm text-ink">
              To become a verified educator, email{' '}
              <a href="mailto:mailcosync@gmail.com" className="font-medium underline underline-offset-2">
                mailcosync@gmail.com
              </a>{' '}
              with proof of your role. Your account is created as an unverified educator until we confirm it —
              there&apos;s no automated check for this yet.
            </p>
          </div>
        )}

        <Button onClick={() => setStep('details')} disabled={!role}>
          Continue
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-col gap-8 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-medium text-ink">Tell us a bit about you</h1>
        <p className="max-w-lg text-sm text-oak">
          Helps us recommend opportunities that fit you — you can skip this or change it anytime in
          Profile settings.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-ink">Interests</h2>
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

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-ink">
          Gender <span className="text-sand">(optional)</span>
        </h2>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger aria-label="Gender (optional)" className="max-w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GENDER_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={() => void handleContinue()} disabled={isSaving || !user}>
          {isSaving ? 'Saving…' : 'Continue'}
        </Button>
        <button
          type="button"
          onClick={() => void handleSkip()}
          disabled={isSaving || !user}
          className="text-sm text-oak underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>
    </PageContainer>
  );
}
