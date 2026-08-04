import { HomeFeed } from '@/components/features/HomeFeed';
import { HomeSidebar } from '@/components/features/HomeSidebar';
import { RequireAuth } from '@/components/features/RequireAuth';
import { PageContainer } from '@/components/layout/PageContainer';

export default function HomePage() {
  return (
    <PageContainer className="flex flex-col gap-6 py-6 lg:flex-row lg:items-start">
      <RequireAuth />
      <div className="min-w-0 flex-1">
        <HomeFeed />
      </div>
      <aside className="w-full shrink-0 lg:w-64">
        <HomeSidebar />
      </aside>
    </PageContainer>
  );
}
