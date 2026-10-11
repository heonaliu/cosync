import type { Metadata } from 'next';

import { PageContainer } from '@/components/layout/PageContainer';

export const metadata: Metadata = {
  title: 'About · CoSync',
};

export default function AboutPage() {
  return (
    <PageContainer className="flex flex-col gap-2 py-12">
      <h1 className="text-[22px] font-medium text-ink">About</h1>
      <p className="text-sm text-oak">Made by Heona Liu and Maya Hazarika from Massachusetts, USA.</p>
    </PageContainer>
  );
}
