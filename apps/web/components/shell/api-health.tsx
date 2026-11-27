"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getHealth, type HealthResponse } from "@/lib/api";

export type ApiHealthState =
  | { kind: "checking" }
  | { kind: "online"; health: HealthResponse }
  | { kind: "offline"; reason: string };

const POLL_MS = 15_000;
const ApiHealthContext = createContext<ApiHealthState>({ kind: "checking" });

/** One shared poller so the context bar and Overview never double-request. */
export function ApiHealthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ApiHealthState>({ kind: "checking" });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const health = await getHealth();
        if (!cancelled) setState({ kind: "online", health });
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Unknown error";
        if (!cancelled) setState({ kind: "offline", reason });
      }
    };
    void check();
    const id = window.setInterval(() => void check(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return <ApiHealthContext.Provider value={state}>{children}</ApiHealthContext.Provider>;
}

export function useApiHealth(): ApiHealthState {
  return useContext(ApiHealthContext);
}
