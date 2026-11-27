import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Disclosure that the data on screen is fictional fixture data, not analysis output. */
export function SampleBadge({ className }: { className?: string }) {
  return (
    <Badge
      tone="neutral"
      className={cn("border-dashed border-line-strong", className)}
      title="Fictional sample data used to build the interface. It is not the result of any analysis."
    >
      Sample data
    </Badge>
  );
}

/** Marks a control or value whose analysis is not built yet. */
export function PlannedBadge({ milestone, className }: { milestone: string; className?: string }) {
  return <Badge tone="planned" className={className}>Planned · {milestone}</Badge>;
}
