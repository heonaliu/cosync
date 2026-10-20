import { Suspense } from 'react';

import { ClubDetail } from '@/components/features/ClubDetail';
import { RequireAuth } from '@/components/features/RequireAuth';
import { PageContainer } from '@/components/layout/PageContainer';

type ClubDetailPageProps = {
  params: Promise<{ clubId: string }>;
};

export default async function ClubDetailPage({ params }: ClubDetailPageProps) {
  const { clubId } = await params;

  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <RequireAuth />
      <Suspense fallback={<p className="text-sm text-sand">Loading club…</p>}>
        <ClubDetail clubId={clubId} />
      </Suspense>
    </PageContainer>
  );
}
