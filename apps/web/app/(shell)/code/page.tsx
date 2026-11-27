import type { Metadata } from "next";
import { Suspense } from "react";
import { ComparisonWorkspace, WorkspaceFallback } from "@/components/workspace/workspace";

export const metadata: Metadata = { title: "Code Evolution" };

export default function Page() {
  return (
    <Suspense fallback={<WorkspaceFallback lens="code" />}>
      <ComparisonWorkspace lens="code" />
    </Suspense>
  );
}
