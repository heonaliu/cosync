'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { GoogleSignInButton } from '@/components/features/GoogleSignInButton';
import { PageContainer } from '@/components/layout/PageContainer';
import { Avatar } from '@/components/ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/Input';
import { signOutUser } from '@/lib/auth';
import { useAuth } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

const MARKETING_LINKS = [
  { href: '#', label: 'How it works' },
  { href: '#', label: 'Showcase' },
];

const APP_LINKS = [
  { href: '/home', label: 'Home' },
  { href: '/discover', label: 'Discover' },
  { href: '/projects', label: 'Projects' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/clubs', label: 'Clubs' },
];

export function Nav() {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const logoHref = status === 'authed' ? '/home' : '/';

  async function handleLogout(): Promise<void> {
    await signOutUser();
    router.push('/');
  }

  return (
    <nav className={cn('w-full', status === 'authed' && 'border-b border-olive')}>
      <PageContainer className="flex items-center justify-between py-4">
        <Link
          href={logoHref}
          className="flex items-center gap-2 rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
        >
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-[12px] bg-fresh text-base font-medium text-white"
          >
            C
          </span>
          <span className="text-base font-medium text-ink">CoSync</span>
        </Link>

        {status === 'authed' ? (
          <div className="hidden items-center gap-6 md:flex">
            {APP_LINKS.map((link) => {
              const isActive =
                link.href === '/home' ? pathname === '/home' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-pill text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh',
                    isActive ? 'font-medium text-ink' : 'text-oak hover:text-ink'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="hidden items-center gap-8 sm:flex">
            {MARKETING_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-pill text-sm text-oak hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {status === 'authed' && user ? (
          <div className="flex items-center gap-3">
            <Input
              type="search"
              placeholder="Search…"
              aria-label="Search CoSync"
              className="hidden w-48 md:block"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
                >
                  <Avatar name={user.displayName ?? user.email ?? 'You'} decorative />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user.uid}`}>Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/saved">Saved</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleLogout()}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : status === 'anon' ? (
          <GoogleSignInButton size="lg">Sign in</GoogleSignInButton>
        ) : (
          <div className="size-10" aria-hidden="true" />
        )}
      </PageContainer>
    </nav>
  );
}
