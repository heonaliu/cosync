import { DiscoverBoard } from '@/components/features/DiscoverBoard';
import { RequireAuth } from '@/components/features/RequireAuth';
import { PageContainer } from '@/components/layout/PageContainer';

// DiscoverBoard loads its own projects on the client. Fetching here, in a
// server component, ran the Firestore query with no signed-in user — the
// projects read rule requires request.auth, so it was always denied and the
// page always rendered empty.
export default function DiscoverPage() {
  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <RequireAuth />
      <DiscoverBoard />
    </PageContainer>
  );
}
