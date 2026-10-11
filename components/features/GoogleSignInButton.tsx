'use client';

import { FirebaseError } from 'firebase/app';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { signInWithGoogle } from '@/lib/auth';

type GoogleSignInButtonProps = {
  children: React.ReactNode;
  size?: 'lg' | 'xl';
  className?: string;
};

export function GoogleSignInButton({ children, size = 'lg', className }: GoogleSignInButtonProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleClick(): Promise<void> {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
      toast.error(
        error instanceof FirebaseError && error.code === 'auth/popup-blocked'
          ? 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.'
          : 'Could not sign in. Try again.'
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={isSigningIn} size={size} className={className}>
      {isSigningIn ? 'Signing in…' : children}
    </Button>
  );
}
