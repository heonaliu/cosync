import { DiscoverBoard } from '@/components/features/DiscoverBoard';
import { RequireAuth } from '@/components/features/RequireAuth';
import { PageContainer } from '@/components/layout/PageContainer';
import { getDiscoverProjects } from '@/lib/queries';

export default async function DiscoverPage() {
  const projects = await getDiscoverProjects().catch((error: unknown) => {
    console.error('Failed to load discover projects:', error);
    return [];
  });

  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <RequireAuth />
      <DiscoverBoard projects={projects} />
    </PageContainer>
  );
}
