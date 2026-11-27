import { cn } from "@/lib/utils";

interface PanelProps extends Omit<React.ComponentProps<"section">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Remove body padding (for lists/tables that manage their own). */
  flush?: boolean;
}

export function Panel({ title, description, actions, flush, className, children, ...props }: PanelProps) {
  return (
    <section className={cn("rounded-panel border border-line bg-surface", className)} {...props}>
      <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-body font-semibold text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-small text-fg-2">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className={flush ? undefined : "p-4"}>{children}</div>
    </section>
  );
}
