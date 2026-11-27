"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/states";
import { getModule } from "@/lib/modules";
import type { DiffLayout, VisualView, Zoom } from "@/lib/comparison/workspace-params";
import { cn } from "@/lib/utils";
import { useComparison } from "./comparison-context";
import { DiffViewer } from "./diff-viewer";
import { FilesList, STATUS_LABEL, STATUS_TONE } from "./files-list";
import { ImageCanvas, type LoadedSize, type ShotId } from "./image-canvas";
import { Inspector, type LoadedSizes } from "./inspector";
import { SampleBadge } from "./sample-badge";
import { ScreensList } from "./screens-list";
import { useWorkspaceParams } from "./use-workspace-params";
import { Badge } from "@/components/ui/badge";

type Lens = "visual" | "code";
type Pane = "list" | "canvas" | "inspector";

const VIEWS: readonly SegmentedOption<VisualView>[] = [
  { value: "slider", label: "Slider", shortcut: "1" },
  { value: "side-by-side", label: "Side by side", shortcut: "2" },
  { value: "overlay", label: "Overlay", shortcut: "3" },
];
const ZOOM_OPTIONS: readonly SegmentedOption<Zoom>[] = [
  { value: "fit", label: "Fit" },
  { value: "100", label: "100%" },
];
const LAYOUTS: readonly SegmentedOption<DiffLayout>[] = [
  { value: "unified", label: "Unified", shortcut: "1" },
  { value: "split", label: "Split", shortcut: "2" },
];

function isEditable(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

/** A control for analysis that does not exist yet. It stays discoverable but does nothing. */
function PlannedControl({ label, milestone }: { label: string; milestone: string }) {
  return (
    <button
      type="button"
      aria-disabled="true"
      onClick={(e) => e.preventDefault()}
      title={`${label} view is planned for ${milestone}`}
      className="inline-flex h-6 cursor-not-allowed items-center gap-1.5 rounded-control border border-dashed border-line-strong px-2 text-small text-fg-3"
    >
      {label}
      <span className="text-micro">{milestone}</span>
      <span className="sr-only">Planned, not available yet</span>
    </button>
  );
}

const paneToggle =
  "hidden h-8 items-center gap-1.5 rounded-control border border-line-strong px-2 text-small text-fg-2 transition-colors duration-150 hover:bg-raised hover:text-fg lg:inline-flex";

export function ComparisonWorkspace({ lens }: { lens: Lens }) {
  const comparison = useComparison();
  const { view, layout, zoom, fileId, update } = useWorkspaceParams(comparison.files);
  const [pane, setPane] = useState<Pane>("canvas");
  const [listOpen, setListOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [opacity, setOpacity] = useState(50);
  const [loaded, setLoaded] = useState<LoadedSizes>({});

  // With the sidebar open, three panes leave the canvas too narrow below ~1440px,
  // so the inspector starts collapsed there. The toggle still opens it.
  useEffect(() => {
    if (window.innerWidth < 1440) setInspectorOpen(false);
  }, []);

  const file = comparison.files.find((f) => f.id === fileId) ?? null;
  const label = getModule(lens).label;
  const fileQuery = fileId ? `?file=${encodeURIComponent(fileId)}` : "";

  const onLoadSize = useCallback((which: ShotId, size: LoadedSize) => {
    setLoaded((prev) => {
      const cur = prev[which];
      return cur && cur.width === size.width && cur.height === size.height ? prev : { ...prev, [which]: size };
    });
  }, []);

  // 1/2/3 switch views (visual) or diff layout (code), unless the user is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return;
      const n = Number(e.key);
      if (lens === "visual") {
        const v = VIEWS[n - 1];
        if (v) update({ view: v.value });
      } else {
        const l = LAYOUTS[n - 1];
        if (l) update({ layout: l.value });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lens, update]);

  const showPane = (p: Pane) => cn(pane === p ? "flex" : "hidden");

  return (
    <div className="flex h-full min-h-[32rem] flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
        <h1 className="text-title font-semibold tracking-tight text-fg">{label}</h1>
        <SampleBadge />
        <p className="hidden min-w-0 truncate text-small text-fg-2 md:block">
          {comparison.title} · {comparison.before.label} → {comparison.after.label}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <nav aria-label="Comparison lens" className="inline-flex rounded-control border border-line-strong p-0.5">
            {(
              [
                ["visual", "/visual", "Visual"],
                ["code", "/code", "Code"],
              ] as const
            ).map(([id, href, text]) => (
              <Link
                key={id}
                href={`${href}${fileQuery}`}
                aria-current={lens === id ? "page" : undefined}
                className={cn(
                  "inline-flex h-6 items-center rounded-control px-2.5 text-small transition-colors duration-150",
                  lens === id ? "bg-accent text-accent-fg" : "text-fg-2 hover:bg-raised hover:text-fg",
                )}
              >
                {text}
              </Link>
            ))}
          </nav>
          <button type="button" className={paneToggle} aria-expanded={listOpen} aria-controls="pane-list" onClick={() => setListOpen((o) => !o)}>
            {listOpen ? <PanelLeftClose className="size-3.5" aria-hidden /> : <PanelLeftOpen className="size-3.5" aria-hidden />}
            {listOpen ? "Hide list" : "Show list"}
          </button>
          <button type="button" className={paneToggle} aria-expanded={inspectorOpen} aria-controls="pane-inspector" onClick={() => setInspectorOpen((o) => !o)}>
            {inspectorOpen ? <PanelRightClose className="size-3.5" aria-hidden /> : <PanelRightOpen className="size-3.5" aria-hidden />}
            {inspectorOpen ? "Hide inspector" : "Show inspector"}
          </button>
        </div>
      </header>

      <div role="group" aria-label="Workspace pane" className="flex gap-1 border-b border-line bg-surface p-2 lg:hidden">
        {(
          [
            ["list", lens === "visual" ? "Screens" : "Files"],
            ["canvas", "Canvas"],
            ["inspector", "Inspector"],
          ] as const
        ).map(([p, text]) => (
          <button
            key={p}
            type="button"
            aria-pressed={pane === p}
            onClick={() => setPane(p)}
            className={cn(
              "h-8 flex-1 rounded-control text-ui transition-colors duration-150",
              pane === p ? "bg-accent text-accent-fg" : "text-fg-2 hover:bg-raised hover:text-fg",
            )}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <aside
          id="pane-list"
          aria-label={lens === "visual" ? "Screens" : "Changed files"}
          className={cn(showPane("list"), listOpen ? "lg:flex" : "lg:hidden", "w-full shrink-0 flex-col border-r border-line bg-surface lg:w-72")}
        >
          <h2 className="border-b border-line px-3 py-2.5 text-body font-semibold text-fg">{lens === "visual" ? "Screens" : "Changes"}</h2>
          {lens === "visual" ? (
            <ScreensList comparison={comparison} fileQuery={fileQuery} />
          ) : (
            <FilesList
              files={comparison.files}
              selectedId={fileId}
              onSelect={(id) => {
                update({ file: id });
                setPane("canvas");
              }}
            />
          )}
        </aside>

        <section aria-label="Comparison canvas" className={cn(showPane("canvas"), "lg:flex min-w-0 flex-1 flex-col bg-app")}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2">
            {lens === "visual" ? (
              <>
                <Segmented label="View" value={view} onChange={(v) => update({ view: v })} options={VIEWS} />
                <Segmented label="Zoom" value={zoom} onChange={(z) => update({ zoom: z })} options={ZOOM_OPTIONS} />
                {view === "overlay" && (
                  <label className="inline-flex items-center gap-2 text-small text-fg-2">
                    After opacity
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      aria-valuetext={`${opacity}%`}
                      className="w-32 accent-[var(--accent)]"
                    />
                    <span className="w-9 font-mono text-fg">{opacity}%</span>
                  </label>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <PlannedControl label="Difference" milestone="M2" />
                  <PlannedControl label="Heatmap" milestone="M2" />
                </div>
              </>
            ) : (
              <>
                <Segmented label="Diff layout" value={layout} onChange={(l) => update({ layout: l })} options={LAYOUTS} />
                {file && (
                  <div className="ml-auto flex min-w-0 items-center gap-2">
                    <code className="truncate font-mono text-small text-fg-2">{file.path}</code>
                    <Badge tone={STATUS_TONE[file.status]}>{STATUS_LABEL[file.status]}</Badge>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {lens === "visual" ? (
              <ImageCanvas
                view={view}
                zoom={zoom}
                before={comparison.screen.before}
                after={comparison.screen.after}
                opacity={opacity}
                onLoadSize={onLoadSize}
              />
            ) : file ? (
              <div className="overflow-auto rounded-panel border border-line bg-surface">
                <DiffViewer file={file} layout={layout} />
              </div>
            ) : (
              <EmptyState title="No file selected" description="Choose a file from the list to see its changes." />
            )}
          </div>
        </section>

        <aside
          id="pane-inspector"
          aria-label="Inspector"
          className={cn(showPane("inspector"), inspectorOpen ? "lg:flex" : "lg:hidden", "w-full shrink-0 flex-col overflow-y-auto border-l border-line bg-surface lg:w-80")}
        >
          <h2 className="border-b border-line px-4 py-2.5 text-body font-semibold text-fg">Inspector</h2>
          <Inspector lens={lens} comparison={comparison} file={file} loaded={loaded} />
        </aside>
      </div>
    </div>
  );
}

export function WorkspaceFallback({ lens }: { lens: Lens }) {
  return (
    <div className="px-4 py-3">
      <h1 className="text-title font-semibold tracking-tight text-fg">{getModule(lens).label}</h1>
      <p className="mt-2 text-small text-fg-3">Loading workspace…</p>
    </div>
  );
}
