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
      <ClubDetail clubId={clubId} />
    </PageContainer>
  );
}
