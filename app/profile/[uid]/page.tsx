import { ProfileView } from '@/components/features/ProfileView';
import { RequireAuth } from '@/components/features/RequireAuth';
import { PageContainer } from '@/components/layout/PageContainer';

type ProfilePageProps = {
  params: Promise<{ uid: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { uid } = await params;

  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <RequireAuth />
      <ProfileView uid={uid} />
    </PageContainer>
  );
}
