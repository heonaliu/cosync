import { ProjectDetail } from '@/components/features/ProjectDetail';
import { RequireAuth } from '@/components/features/RequireAuth';
import { PageContainer } from '@/components/layout/PageContainer';

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;

  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <RequireAuth />
      <ProjectDetail projectId={projectId} />
    </PageContainer>
  );
}
