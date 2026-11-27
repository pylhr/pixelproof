"use client";

import { useApiHealth } from "@/components/shell/api-health";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { API_URL } from "@/lib/api";
import { MODULES } from "@/lib/modules";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className="text-ui text-fg-2">{label}</dt>
      <dd className="min-w-0 text-ui text-fg">{children}</dd>
    </div>
  );
}

export function SystemStatus() {
  const api = useApiHealth();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="System" description="Live values from this running build." flush>
        <dl className="divide-y divide-line">
          <Row label="Backend API">
            {api.kind === "online" && <Badge tone="added">Online · v{api.health.version}</Badge>}
            {api.kind === "offline" && <Badge tone="removed">Offline</Badge>}
            {api.kind === "checking" && <Badge>Checking…</Badge>}
          </Row>
          <Row label="API address">
            <code className="font-mono text-small">{API_URL}</code>
          </Row>
          <Row label="AI explanations">
            <Badge tone="planned">Not implemented · Phase 5</Badge>
          </Row>
        </dl>
        {api.kind === "offline" && (
          <p className="border-t border-line px-4 py-3 text-small text-fg-2">
            Start the backend with <code className="font-mono">scripts/dev.ps1</code>. Reason reported: {api.reason}
          </p>
        )}
      </Panel>

      <Panel title="Module status" description="What is actually built." flush>
        <ul className="divide-y divide-line">
          {MODULES.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <span className="text-ui text-fg">{m.label}</span>
              {m.status === "implemented" ? (
                <Badge tone="added">Implemented · {m.milestone}</Badge>
              ) : m.status === "preview" ? (
                <Badge tone="neutral" className="border-dashed border-line-strong">Preview · sample data</Badge>
              ) : (
                <Badge tone="planned">Planned · {m.milestone}</Badge>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
