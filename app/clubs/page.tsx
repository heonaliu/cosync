import { ClubsBoard } from '@/components/features/ClubsBoard';
import { RequireAuth } from '@/components/features/RequireAuth';
import { PageContainer } from '@/components/layout/PageContainer';

export default function ClubsPage() {
  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <RequireAuth />
      <ClubsBoard />
    </PageContainer>
  );
}
