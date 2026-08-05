import { Card } from '@/components/ui/Card';
import type { Club } from '@/lib/types';

type ClubAboutCardProps = {
  club: Club;
};

export function ClubAboutCard({ club }: ClubAboutCardProps) {
  const hasDetailRow = Boolean(club.meetsSchedule || club.cohortSize || club.cost);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium text-ink">About this club</h2>
        <p className="text-sm text-oak">{club.description}</p>
      </div>

      {hasDetailRow && (
        <div className="flex flex-wrap gap-6 border-t border-olive pt-4">
          {club.meetsSchedule && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-sand">Meets</span>
              <span className="text-sm text-ink">{club.meetsSchedule}</span>
            </div>
          )}
          {club.cohortSize && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-sand">Cohort size</span>
              <span className="text-sm text-ink">{club.cohortSize}</span>
            </div>
          )}
          {club.cost && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-sand">Cost</span>
              <span className="text-sm text-ink">{club.cost}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
