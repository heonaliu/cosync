'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/lib/useAuth';

// Renders nothing — just reacts to auth state resolving to "signed in" and
// sends the visitor on to /home. Lives on the landing page so a returning,
// already-authenticated visitor doesn't sit on the marketing page.
export function RedirectIfSignedIn(): null {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authed') {
      router.replace('/home');
    }
  }, [status, router]);

  return null;
}
