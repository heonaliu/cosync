import { RequireAuth } from '@/components/features/RequireAuth';
import { ThreadView } from '@/components/features/ThreadView';
import { PageContainer } from '@/components/layout/PageContainer';

type ThreadPageProps = {
  params: Promise<{ postId: string }>;
};

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { postId } = await params;

  return (
    <PageContainer className="flex max-w-2xl flex-col gap-6 py-6">
      <RequireAuth />
      <ThreadView postId={postId} />
    </PageContainer>
  );
}
