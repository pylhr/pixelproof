"use client";

import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { useApiHealth } from "@/components/shell/api-health";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

export function StartComparison() {
  const api = useApiHealth();
  const offline = api.kind === "offline";
  return (
    <Panel
      title="Start a comparison"
      description="Two screenshots in, measured differences out."
      actions={offline ? <Badge tone="unknown">API offline</Badge> : undefined}
    >
      <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-panel border border-dashed border-line-strong p-5 text-center">
          <p className="text-ui font-medium text-fg">Before</p>
          <p className="mt-1 text-small text-fg-2">A screenshot of the earlier version</p>
        </div>
        <ArrowLeftRight className="mx-auto size-4 text-fg-3" aria-hidden />
        <div className="rounded-panel border border-dashed border-line-strong p-5 text-center">
          <p className="text-ui font-medium text-fg">After</p>
          <p className="mt-1 text-small text-fg-2">A screenshot of the newer version</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/visual?new=1"
          className="inline-flex h-8 items-center justify-center rounded-control bg-accent px-3 text-ui font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-hover"
        >
          Compare two screenshots
        </Link>
        <p className="text-small text-fg-3">
          {offline ? "Start the API with scripts\\dev.ps1 to run comparisons. " : ""}Importing project versions (ZIP and Git) arrives in M3 and M4.
        </p>
      </div>
    </Panel>
  );
}
