import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {icon && <div className="mb-3 text-fg-3">{icon}</div>}
      <p className="text-body font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-ui text-fg-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-panel border border-removed bg-removed-soft p-4">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-removed" aria-hidden />
      <div className="min-w-0">
        <p className="text-ui font-medium text-fg">{title}</p>
        {description && <p className="mt-0.5 text-small text-fg-2">{description}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-control bg-raised motion-safe:animate-pulse", className)} />;
}
