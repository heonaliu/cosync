'use client';

import { useEffect, useState } from 'react';

import { auth, firebaseApp } from '@/lib/firebase';

type Status = 'checking' | 'connected' | 'error';

export default function TestPage() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    async function checkFirebase(): Promise<void> {
      try {
        const { projectId, apiKey, authDomain } = firebaseApp.options;
        if (!projectId || !apiKey || !authDomain) {
          throw new Error(
            'Missing Firebase config values — check that .env.local (or .env) has all NEXT_PUBLIC_FIREBASE_* keys set.'
          );
        }

        // authStateReady() round-trips to the Firebase Auth API for the
        // configured project, so it fails fast on a bad API key or project ID
        // instead of only failing later when a real sign-in is attempted.
        await auth.authStateReady();

        console.log('Firebase connected', { projectId, authDomain });
        setStatus('connected');
      } catch (error) {
        console.error('Firebase connection failed:', error);
        setStatus('error');
      }
    }

    void checkFirebase();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: 'monospace' }}>
      <p>Firebase check: {status}</p>
      <p>Open the browser console for details.</p>
    </main>
  );
}
