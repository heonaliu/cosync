import { NotificationsView } from '@/components/features/NotificationsView';
import { RequireAuth } from '@/components/features/RequireAuth';
import { PageContainer } from '@/components/layout/PageContainer';

export default function NotificationsPage() {
  return (
    <PageContainer className="flex max-w-2xl flex-col gap-6 py-6">
      <RequireAuth />
      <h1 className="text-[22px] font-medium text-ink">Notifications</h1>
      <NotificationsView />
    </PageContainer>
  );
}
