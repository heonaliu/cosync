'use client';

import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { PillToggle } from '@/components/ui/PillToggle';
import { db } from '@/lib/firebase';
import { PROJECT_CATEGORY_TAGS } from '@/lib/tags';
import { useAuth } from '@/lib/useAuth';

// "Prefer not to say" first and pre-selected — the field is genuinely
// optional, and defaulting to the private option (rather than defaulting to
// an arbitrary named gender) is what makes that credible.
const GENDER_OPTIONS = ['Prefer not to say', 'Female', 'Male', 'Non-binary', 'Other'];

export default function OnboardingPage() {
  const { user, status } = useAuth();
  const router = useRouter();

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

  // "Skip" writes only the completion marker — interests/gender stay
  // genuinely unanswered (not defaulted to empty/"prefer not to say" values)
  // so a skip is distinguishable later from someone who actually answered.
  async function handleSkip(): Promise<void> {
    if (!user) return;
    setIsSaving(true);
    setError(null);
    try {
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
      await setDoc(
        doc(db, 'users', user.uid, 'private', 'profile'),
        {
          interests: selectedInterests,
          gender,
          onboardedAt: serverTimestamp(),
        },
        { merge: true }
      );
      router.push('/home');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Something went wrong.');
      setIsSaving(false);
    }
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
        <select
          value={gender}
          onChange={(event) => setGender(event.target.value)}
          aria-label="Gender (optional)"
          className="h-10 w-full max-w-64 rounded-pill border border-olive bg-white px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-fresh"
        >
          {GENDER_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
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
