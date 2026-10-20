import { OpportunitiesBoard } from '@/components/features/OpportunitiesBoard';
import { RequireAuth } from '@/components/features/RequireAuth';
import { PageContainer } from '@/components/layout/PageContainer';

export default function OpportunitiesPage() {
  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <RequireAuth />
      <OpportunitiesBoard />
    </PageContainer>
  );
}
