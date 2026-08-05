import { ProjectsBoard } from '@/components/features/ProjectsBoard';
import { RequireAuth } from '@/components/features/RequireAuth';
import { PageContainer } from '@/components/layout/PageContainer';

export default function ProjectsPage() {
  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <RequireAuth />
      <ProjectsBoard />
    </PageContainer>
  );
}
