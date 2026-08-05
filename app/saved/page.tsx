import { RequireAuth } from '@/components/features/RequireAuth';
import { SavedOpportunities } from '@/components/features/SavedOpportunities';
import { PageContainer } from '@/components/layout/PageContainer';

export default function SavedPage() {
  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <RequireAuth />
      <h1 className="text-[22px] font-medium text-ink">Saved</h1>
      <SavedOpportunities />
    </PageContainer>
  );
}
