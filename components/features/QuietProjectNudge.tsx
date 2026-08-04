import { Button } from '@/components/ui/button';
import type { Project } from '@/lib/types';

type QuietProjectNudgeProps = {
  project: Project;
  quietDays: number;
};

export function QuietProjectNudge({ project, quietDays }: QuietProjectNudgeProps) {
  return (
    <div className="flex flex-col gap-3 rounded-card bg-amber p-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-deep-amber">
          {project.title} has been quiet for {quietDays} day{quietDays === 1 ? '' : 's'}
        </p>
        <p className="text-sm text-deep-amber/80">
          Even a photo of your workbench counts. What did you tinker with this week?
        </p>
      </div>
      <Button variant="dark" size="sm" className="self-start">
        Post an update
      </Button>
    </div>
  );
}
