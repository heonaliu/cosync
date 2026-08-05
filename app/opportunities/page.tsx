import { OpportunitiesBoard } from '@/components/features/OpportunitiesBoard';
import { RequireAuth } from '@/components/features/RequireAuth';
import { PageContainer } from '@/components/layout/PageContainer';

// No server-side fetch here on purpose. The opportunities read rule requires
// request.auth != null, and a Server Component has no browser session to
// carry that auth token — so an auth-gated read attempted here would always
// fail, regardless of who's actually signed in. OpportunitiesBoard fetches
// client-side instead, same pattern as HomeFeed.
export default function OpportunitiesPage() {
  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <RequireAuth />
      <OpportunitiesBoard />
    </PageContainer>
  );
}
