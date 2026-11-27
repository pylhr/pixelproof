"use client";

import { useRef, useState } from "react";
import { ChevronsLeftRight } from "lucide-react";
import { ErrorState } from "@/components/ui/states";
import type { ImageAsset } from "@/lib/comparison/types";
import type { VisualView, Zoom } from "@/lib/comparison/workspace-params";
import { cn } from "@/lib/utils";

export type ShotId = "before" | "after";
export interface LoadedSize {
  width: number;
  height: number;
}

interface ShotProps {
  asset: ImageAsset;
  which: ShotId;
  onLoadSize: (which: ShotId, size: LoadedSize) => void;
  onFail: (which: ShotId) => void;
  className?: string;
  style?: React.CSSProperties;
}

function Shot({ asset, which, onLoadSize, onFail, className, style }: ShotProps) {
  const report = (img: HTMLImageElement) => onLoadSize(which, { width: img.naturalWidth, height: img.naturalHeight });
  return (
    // Plain <img>: screenshots must be shown byte-exact, and next/image would re-encode and resize them.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={(el) => {
        if (el?.complete && el.naturalWidth > 0) report(el);
      }}
      src={asset.src}
      alt={asset.alt}
      draggable={false}
      onLoad={(e) => report(e.currentTarget)}
      onError={() => onFail(which)}
      className={cn("block select-none", className)}
      style={style}
    />
  );
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** Chip drawn over the image, so it uses fixed contrast rather than theme surfaces. */
function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("pointer-events-none absolute top-2 rounded-control bg-fg/80 px-1.5 text-micro font-medium text-app", className)}>
      {children}
    </span>
  );
}

interface CanvasProps {
  view: VisualView;
  zoom: Zoom;
  before: ImageAsset;
  after: ImageAsset;
  /** After-image opacity for the overlay view, 0-100. */
  opacity: number;
  onLoadSize: (which: ShotId, size: LoadedSize) => void;
}

export function ImageCanvas({ view, zoom, before, after, opacity, onLoadSize }: CanvasProps) {
  const [failed, setFailed] = useState<ShotId[]>([]);
  const onFail = (which: ShotId) => setFailed((f) => (f.includes(which) ? f : [...f, which]));

  if (failed.length > 0) {
    return (
      <ErrorState
        title="A screenshot could not be loaded"
        description={`Could not load the ${failed.join(" and ")} image. Check that the file exists and reload the page.`}
      />
    );
  }

  const shotProps = { onLoadSize, onFail };
  const frame: React.CSSProperties =
    zoom === "fit"
      ? { width: "100%", maxWidth: before.width, aspectRatio: `${before.width} / ${before.height}` }
      : { width: before.width, flexShrink: 0, aspectRatio: `${before.width} / ${before.height}` };
  const fitImg = zoom === "fit" ? "w-full" : undefined;
  const imgStyle: React.CSSProperties | undefined = zoom === "fit" ? undefined : { width: before.width };

  if (view === "side-by-side") {
    const figs: [ShotId, ImageAsset, string][] = [
      ["before", before, "Before"],
      ["after", after, "After"],
    ];
    return (
      <div className={cn("grid gap-4", zoom === "fit" ? "grid-cols-1 xl:grid-cols-2" : "w-max grid-cols-2")}>
        {figs.map(([which, asset, label]) => (
          <figure key={which} className="min-w-0">
            <figcaption className="mb-1.5 text-small font-medium text-fg-2">{label}</figcaption>
            <div className="overflow-hidden rounded-control border border-line">
              <Shot asset={asset} which={which} {...shotProps} className={fitImg} style={imgStyle} />
            </div>
          </figure>
        ))}
      </div>
    );
  }

  if (view === "overlay") {
    return (
      <div className={cn("relative overflow-hidden rounded-control border border-line", zoom === "fit" && "mx-auto")} style={frame}>
        <Shot asset={before} which="before" {...shotProps} className="absolute inset-0 size-full" />
        <Shot
          asset={after}
          which="after"
          {...shotProps}
          className="absolute inset-0 size-full"
          style={{ opacity: opacity / 100 }}
        />
        <Chip className="left-2">Before</Chip>
        <Chip className="right-2">After · {opacity}%</Chip>
      </div>
    );
  }

  return <SliderView frame={frame} before={before} after={after} shotProps={shotProps} center={zoom === "fit"} />;
}

function SliderView({
  frame,
  before,
  after,
  shotProps,
  center,
}: {
  frame: React.CSSProperties;
  before: ImageAsset;
  after: ImageAsset;
  shotProps: Pick<ShotProps, "onLoadSize" | "onFail">;
  center: boolean;
}) {
  const [pos, setPos] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = (clientX: number) => {
    const r = frameRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setPos(clamp(((clientX - r.left) / r.width) * 100));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    let next: number | null = null;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = pos - step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = pos + step;
    else if (e.key === "PageDown") next = pos - 10;
    else if (e.key === "PageUp") next = pos + 10;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    if (next === null) return;
    e.preventDefault();
    setPos(clamp(next));
  };

  const shown = Math.round(pos);
  return (
    <div
      ref={frameRef}
      className={cn("relative touch-pan-y overflow-hidden rounded-control border border-line", center && "mx-auto")}
      style={frame}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = true;
        setFromClientX(e.clientX);
        handleRef.current?.focus({ preventScroll: true });
      }}
      onPointerMove={(e) => {
        if (dragging.current) setFromClientX(e.clientX);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      <Shot asset={before} which="before" {...shotProps} className="absolute inset-0 size-full" />
      <Shot
        asset={after}
        which="after"
        {...shotProps}
        className="absolute inset-0 size-full"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      />
      <Chip className="left-2">Before</Chip>
      <Chip className="right-2">After</Chip>

      <div className="pointer-events-none absolute inset-y-0 w-0" style={{ left: `${pos}%` }}>
        {/* Fixed light line with a dark edge so it reads over any screenshot content. */}
        <div aria-hidden className="absolute inset-y-0 -left-px w-0.5 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)]" />
        <div
          ref={handleRef}
          role="slider"
          tabIndex={0}
          aria-label="Before and after divider"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={shown}
          aria-valuetext={`${shown}% before, ${100 - shown}% after`}
          onKeyDown={onKeyDown}
          className="pointer-events-auto absolute top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-line-strong bg-surface text-fg shadow-float"
        >
          <ChevronsLeftRight className="size-4" aria-hidden />
        </div>
      </div>
    </div>
  );
}
