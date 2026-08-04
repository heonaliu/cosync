import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { AccentColor } from '@/lib/color';

type FeatureCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  color: AccentColor;
  title: string;
  description: string;
};

export function FeatureCard({ icon, color, title, description }: FeatureCardProps) {
  return (
    <Card className="flex flex-col gap-4">
      <Badge icon={icon} color={color} />
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        <p className="text-sm text-oak">{description}</p>
      </div>
    </Card>
  );
}
