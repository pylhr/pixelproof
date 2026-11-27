"use client";

import Link from "next/link";
import { Monitor, Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { useApiHealth } from "@/components/shell/api-health";
import { API_URL } from "@/lib/api";
import { useTheme, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function SettingsPanels() {
  const { pref, setPref } = useTheme();
  const api = useApiHealth();
  return (
    <div className="space-y-6">
      <Panel title="Appearance" description="Applies immediately and is remembered in this browser.">
        <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-control border border-line-strong p-0.5">
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = pref === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPref(value)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-control px-3 text-ui transition-colors duration-150",
                  selected ? "bg-accent text-accent-fg" : "text-fg-2 hover:bg-raised hover:text-fg",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="Connection" description="Set NEXT_PUBLIC_API_URL in apps/web/.env.local to change this." flush>
        <dl className="divide-y divide-line">
          <div className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-ui text-fg-2">API address</dt>
            <dd><code className="font-mono text-small text-fg">{API_URL}</code></dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-ui text-fg-2">Status</dt>
            <dd>
              {api.kind === "online" && <Badge tone="added">Online</Badge>}
              {api.kind === "offline" && <Badge tone="removed">Offline</Badge>}
              {api.kind === "checking" && <Badge>Checking…</Badge>}
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel title="AI explanations" description="Optional, off by default. The product works fully without it.">
        <Badge tone="planned">Not implemented · Phase 5</Badge>
      </Panel>

      <Panel title="Developer">
        <Link href="/design-system" className="text-ui font-medium text-accent underline-offset-2 hover:underline">
          Open the design system reference
        </Link>
      </Panel>
    </div>
  );
}
