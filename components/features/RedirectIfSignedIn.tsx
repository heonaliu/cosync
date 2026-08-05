'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/lib/useAuth';
import { useOnboardingStatus } from '@/lib/useOnboardingStatus';

// Renders nothing — just reacts to auth state resolving to "signed in" and
// sends the visitor on to /onboarding (first-time) or /home (already
// onboarded). Lives on the landing page so a returning, already-
// authenticated visitor doesn't sit on the marketing page.
export function RedirectIfSignedIn(): null {
  const { status } = useAuth();
  const onboarding = useOnboardingStatus();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authed' && onboarding !== 'loading') {
      router.replace(onboarding === 'needed' ? '/onboarding' : '/home');
    }
  }, [status, onboarding, router]);

  return null;
}
