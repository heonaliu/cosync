import { IconArrowRight, IconBook2, IconSparkles, IconUsers } from '@tabler/icons-react';

import { FeatureCard } from '@/components/features/FeatureCard';
import { GoogleSignInButton } from '@/components/features/GoogleSignInButton';
import { LandingJournalTicker } from '@/components/features/LandingJournalTicker';
import { RedirectIfSignedIn } from '@/components/features/RedirectIfSignedIn';
import { PageContainer } from '@/components/layout/PageContainer';

export default function LandingPage() {
  return (
    <PageContainer className="flex flex-col gap-16 py-12">
      <RedirectIfSignedIn />

      <section className="flex flex-col gap-6">
        <h1 className="text-5xl leading-tight font-medium text-ink">
          A home for
          <br />
          young makers.
        </h1>
        <p className="max-w-xl text-sm text-oak">
          Find collaborators, journal your builds, and discover opportunities. Built for middle
          and high school students who like making things.
        </p>
        <GoogleSignInButton size="xl" className="self-start">
          Get started with Google
          <IconArrowRight className="size-5" aria-hidden="true" />
        </GoogleSignInButton>
      </section>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <FeatureCard
          icon={IconUsers}
          color="sky"
          title="Collaborate"
          description="Find teammates who care about the same problems."
        />
        <FeatureCard
          icon={IconBook2}
          color="amber"
          title="Journal"
          description="Document builds. Your portfolio grows as you go."
        />
        <FeatureCard
          icon={IconSparkles}
          color="sage"
          title="Discover"
          description="Programs, hackathons, mentors — all in one place."
        />
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-[22px] font-medium text-ink">Fresh from the build journals</h2>
        <LandingJournalTicker />
      </section>
    </PageContainer>
  );
}
