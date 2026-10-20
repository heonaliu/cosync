import { DiscoverBoard } from '@/components/features/DiscoverBoard';
import { RequireAuth } from '@/components/features/RequireAuth';
import { PageContainer } from '@/components/layout/PageContainer';


export default function DiscoverPage() {
  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <RequireAuth />
      <DiscoverBoard />
    </PageContainer>
  );
}
