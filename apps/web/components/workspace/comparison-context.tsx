"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { SAMPLE_COMPARISON } from "@/fixtures";
import type { Comparison } from "@/lib/comparison/types";

interface ComparisonState {
  comparison: Comparison;
  setComparison: (c: Comparison) => void;
  resetToSample: () => void;
}

const ComparisonContext = createContext<ComparisonState | null>(null);

/** Holds the active comparison for the context bar, Overview and workspace.
 *  It starts as the fictional sample; uploading or opening an analysed comparison replaces it. */
export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  const [comparison, setComparison] = useState<Comparison>(SAMPLE_COMPARISON);
  const resetToSample = useCallback(() => setComparison(SAMPLE_COMPARISON), []);
  const value = useMemo(() => ({ comparison, setComparison, resetToSample }), [comparison, resetToSample]);
  return <ComparisonContext.Provider value={value}>{children}</ComparisonContext.Provider>;
}

function useState_(): ComparisonState {
  const c = useContext(ComparisonContext);
  if (!c) throw new Error("useComparison must be used inside <ComparisonProvider>");
  return c;
}

export function useComparison(): Comparison {
  return useState_().comparison;
}

export function useComparisonControls() {
  const { setComparison, resetToSample } = useState_();
  return { setComparison, resetToSample };
}
