'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/lib/useAuth';

// Renders nothing — redirects back to / once Firebase confirms there's no
// signed-in user. Waits for status !== 'loading' first, so a returning
// user's persisted session isn't mistaken for "signed out" mid-check.
export function RequireAuth(): null {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anon') {
      router.replace('/');
    }
  }, [status, router]);

  return null;
}
