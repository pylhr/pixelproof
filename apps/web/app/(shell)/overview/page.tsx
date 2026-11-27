import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { RecentComparisons } from "./recent-comparisons";
import { StartComparison } from "./start-comparison";
import { SystemStatus } from "./system-status";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8 md:px-8">
      <PageHeader title="Overview" description="Understand how your interfaces evolve." />

      <StartComparison />

      <RecentComparisons />

      <SystemStatus />
    </div>
  );
}
