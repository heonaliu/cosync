'use client';

import { useState } from 'react';

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
