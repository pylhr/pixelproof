import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { getModule, type ModuleId } from "@/lib/modules";

/** Honest "not built yet" page: says what the module will do, and when. No fake controls. */
export function ModulePlaceholder({ id }: { id: ModuleId }) {
  const m = getModule(id);
  const Icon = m.icon;
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8 md:px-8">
      <PageHeader title={m.label} description={m.summary} actions={<Badge tone="planned">Planned · {m.milestone}</Badge>} />
      <Panel title="Not implemented yet" description="This module has no functionality in the current build.">
        <div className="flex gap-4">
          <Icon className="mt-0.5 size-5 shrink-0 text-fg-3" aria-hidden />
          <div>
            <p className="text-ui font-medium text-fg">Scope for {m.milestone}</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-ui text-fg-2 marker:text-fg-3">
              {m.capabilities.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>
    </div>
  );
}
