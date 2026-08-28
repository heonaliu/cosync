import { Button } from '@/components/ui/button';
import type { Project } from '@/lib/types';

type QuietProjectNudgeProps = {
  project: Project;
  quietDays: number;
};

// position: sticky, not fixed — sticky is bounded by its containing block
// (here, the feed column div in HomeFeed), so it naturally inherits the
// column's width instead of needing a hard-coded one, and it stops sticking
// once that column's own bottom edge scrolls past the offset, so it can
// never float on top of the sidebar or the site footer beneath it. `fixed`
// would need manual width-matching and manual "hide near the footer" logic
// to get those same guarantees.
export function QuietProjectNudge({ project, quietDays }: QuietProjectNudgeProps) {
  return (
    <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-card bg-amber p-5 shadow-md">
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
