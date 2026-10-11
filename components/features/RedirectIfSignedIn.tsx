'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { takeAfterSignInPath } from '@/lib/afterSignIn';
import { useAuth } from '@/lib/useAuth';
import { useOnboardingStatus } from '@/lib/useOnboardingStatus';

// Renders nothing — just reacts to auth state resolving to "signed in" and
// sends the visitor on to /onboarding (first-time) or /home (already
// onboarded) — or to what they clicked on the landing page, if anything
// (lib/afterSignIn.ts). Lives on the landing page so a returning, already-
// authenticated visitor doesn't sit on the marketing page.
export function RedirectIfSignedIn(): null {
  const { status } = useAuth();
  const onboarding = useOnboardingStatus();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authed' && onboarding !== 'loading') {
      // A first-timer goes through onboarding first; the saved path waits
      // in sessionStorage and onboarding picks it up when it's done.
      router.replace(onboarding === 'needed' ? '/onboarding' : (takeAfterSignInPath() ?? '/home'));
    }
  }, [status, onboarding, router]);

  return null;
}
