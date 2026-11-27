"use client";

import { createContext, useContext } from "react";
import { SAMPLE_COMPARISON } from "@/fixtures";
import type { Comparison } from "@/lib/comparison/types";

const ComparisonContext = createContext<Comparison | null>(null);

/** Supplies the active comparison to the context bar, Overview and workspace.
 *  Until M2/M3 the only source is the fictional sample; this is the one place to swap. */
export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  return <ComparisonContext.Provider value={SAMPLE_COMPARISON}>{children}</ComparisonContext.Provider>;
}

export function useComparison(): Comparison {
  const c = useContext(ComparisonContext);
  if (!c) throw new Error("useComparison must be used inside <ComparisonProvider>");
  return c;
}
