'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/lib/useAuth';
import { useOnboardingStatus } from '@/lib/useOnboardingStatus';

// Renders nothing — redirects back to / once Firebase confirms there's no
// signed-in user, or to /onboarding if they're signed in but haven't
// finished (or skipped) the onboarding survey yet. Waits for both checks to
// resolve past 'loading' first, so a returning user's persisted session
// isn't mistaken for "signed out" or "not onboarded" mid-check.
export function RequireAuth(): null {
  const { status } = useAuth();
  const onboarding = useOnboardingStatus();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anon') {
      router.replace('/');
    } else if (status === 'authed' && onboarding === 'needed') {
      router.replace('/onboarding');
    }
  }, [status, onboarding, router]);

  return null;
}
