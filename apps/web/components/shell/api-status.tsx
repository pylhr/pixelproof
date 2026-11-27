"use client";

import { cn } from "@/lib/utils";
import { useApiHealth } from "./api-health";

export function ApiStatusPill() {
  const state = useApiHealth();
  const label =
    state.kind === "checking" ? "API checking" : state.kind === "online" ? "API online" : "API offline";
  const detail =
    state.kind === "online"
      ? `Connected - v${state.health.version}`
      : state.kind === "offline"
        ? state.reason
        : "Contacting the backend";
  return (
    <span
      role="status"
      title={detail}
      className="inline-flex h-6 items-center gap-1.5 rounded-control border border-line px-2 text-micro font-medium text-fg-2"
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          state.kind === "online" && "bg-added",
          state.kind === "offline" && "bg-removed",
          state.kind === "checking" && "bg-fg-3 motion-safe:animate-pulse",
        )}
      />
      {label}
    </span>
  );
}
