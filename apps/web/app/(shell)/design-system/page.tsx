import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";

export const metadata: Metadata = { title: "Design system" };

const SWATCHES = [
  "bg-app", "bg-surface", "bg-raised", "border-subtle", "border-strong",
  "text-primary", "text-secondary", "text-muted",
  "accent", "accent-hover", "added", "removed", "modified",
];
const TYPE_SCALE = [
  ["text-micro", "11 · Labels, badges", "text-micro"],
  ["text-small", "12 · Secondary text", "text-small"],
  ["text-ui", "13 · Default interface text", "text-ui"],
  ["text-body", "14 · Reading text", "text-body"],
  ["text-title", "16 · Section titles", "text-title"],
  ["text-heading", "20 · Page titles", "text-heading"],
  ["text-display", "28 · Display", "text-display"],
] as const;
const SPACING = [1, 2, 3, 4, 6, 8, 12];
const SHORTCUTS: [string[], string][] = [
  [["Ctrl/⌘", "K"], "Command palette"],
  [["Ctrl/⌘", "B"], "Collapse or expand sidebar"],
  [["↑", "↓"], "Move in palette"],
  [["Enter"], "Run palette command"],
  [["Esc"], "Close palette"],
];

export default function DesignSystemPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8 md:px-8">
      <PageHeader
        title="Design system"
        description="Reference for tokens and components. Colours come from styles/tokens.css and are contrast-checked by scripts/check-contrast.py."
      />

      <Panel title="Colour tokens" description="Switch theme from the toolbar to compare light and dark.">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SWATCHES.map((name) => (
            <li key={name} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="size-8 shrink-0 rounded-control border border-line"
                style={{ background: `var(--${name})` }}
              />
              <code className="truncate font-mono text-small text-fg-2">--{name}</code>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Typography" description="Inter for UI, JetBrains Mono for code. 13px default.">
        <ul className="space-y-3">
          {TYPE_SCALE.map(([token, label, cls]) => (
            <li key={token} className="flex items-baseline gap-4">
              <code className="w-28 shrink-0 font-mono text-small text-fg-3">{token}</code>
              <span className={`${cls} text-fg`}>{label}</span>
            </li>
          ))}
          <li className="flex items-baseline gap-4">
            <code className="w-28 shrink-0 font-mono text-small text-fg-3">font-mono</code>
            <span className="font-mono text-small text-fg">const delta = after - before; // 0123456789</span>
          </li>
        </ul>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Spacing" description="4px base grid (Tailwind scale).">
          <ul className="space-y-2">
            {SPACING.map((n) => (
              <li key={n} className="flex items-center gap-3">
                <code className="w-14 shrink-0 font-mono text-small text-fg-3">{n * 4}px</code>
                <span className="h-3 rounded-[2px] bg-accent" style={{ width: `${n * 4}px` }} aria-hidden />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Radius" description="Borders first, shadows only for floating layers.">
          <div className="flex items-end gap-4">
            {[
              ["control", "rounded-control", "6px"],
              ["panel", "rounded-panel", "8px"],
              ["dialog", "rounded-dialog", "12px"],
            ].map(([name, cls, px]) => (
              <div key={name} className="text-center">
                <div className={`size-14 border border-line-strong bg-raised ${cls}`} />
                <p className="mt-1.5 text-small text-fg-2">{name} · {px}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Buttons" description="Every state is real: hover, focus-visible (Tab), disabled, loading.">
        <div className="space-y-4">
          {(["primary", "secondary", "ghost"] as const).map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              <code className="w-20 font-mono text-small text-fg-3">{variant}</code>
              <Button variant={variant}>Label</Button>
              <Button variant={variant} size="sm">Small</Button>
              <Button variant={variant} disabled>Disabled</Button>
              <Button variant={variant} loading>Loading</Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Badges" description="Evidence grades differ by fill and border style, not colour alone.">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Neutral</Badge>
            <Badge tone="planned">Planned · M2</Badge>
            <Badge tone="added">Added</Badge>
            <Badge tone="removed">Removed</Badge>
            <Badge tone="modified">Modified</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="confirmed">Confirmed</Badge>
            <Badge tone="potential">Potential</Badge>
            <Badge tone="unknown">Unknown</Badge>
          </div>
        </div>
      </Panel>

      <Panel title="Inputs">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-small font-medium text-fg">Default</span>
            <Input placeholder="Placeholder" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-small font-medium text-fg">Disabled</span>
            <Input placeholder="Unavailable" disabled />
          </label>
          <div className="space-y-1.5">
            <label htmlFor="ds-invalid" className="text-small font-medium text-fg">Invalid</label>
            <Input id="ds-invalid" defaultValue="not-a-path" aria-invalid="true" aria-describedby="ds-invalid-msg" />
            <p id="ds-invalid-msg" className="text-small text-removed">Enter a valid repository path.</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-3">
        <Panel title="Empty" flush>
          <EmptyState icon={<Inbox className="size-5" aria-hidden />} title="Nothing here yet" description="Explains what will appear and why." />
        </Panel>
        <Panel title="Error">
          <ErrorState title="Couldn't read archive" description="The file is not a valid ZIP." />
        </Panel>
        <Panel title="Loading">
          <div className="space-y-2" role="status" aria-label="Loading">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </Panel>
      </div>

      <Panel title="Keyboard shortcuts" description="Only shortcuts that exist in this build.">
        <ul className="space-y-2">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between">
              <span className="text-ui text-fg-2">{label}</span>
              <span className="flex gap-1">{keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
