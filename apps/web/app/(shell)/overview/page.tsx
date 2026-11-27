import type { Metadata } from "next";
import { ArrowLeftRight, GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { SystemStatus } from "./system-status";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8 md:px-8">
      <PageHeader title="Overview" description="Understand how your interfaces evolve." />

      <Panel title="Start a comparison" description="Two versions in, one workspace out." actions={<Badge tone="planned">Planned · M2</Badge>}>
        <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]" aria-label="Version A and Version B (not yet available)">
          <div className="rounded-panel border border-dashed border-line-strong p-5 text-center">
            <p className="text-ui font-medium text-fg">Version A</p>
            <p className="mt-1 text-small text-fg-2">Before: screenshot, ZIP or commit</p>
          </div>
          <ArrowLeftRight className="mx-auto size-4 text-fg-3" aria-hidden />
          <div className="rounded-panel border border-dashed border-line-strong p-5 text-center">
            <p className="text-ui font-medium text-fg">Version B</p>
            <p className="mt-1 text-small text-fg-2">After: screenshot, ZIP or commit</p>
          </div>
        </div>
      </Panel>

      <Panel title="Recent comparisons" flush>
        <EmptyState
          icon={<GitCompareArrows className="size-5" aria-hidden />}
          title="No comparisons yet"
          description="Comparisons will be listed here once screenshot comparison ships in M2."
        />
      </Panel>

      <SystemStatus />
    </div>
  );
}
