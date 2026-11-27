"use client";

import { useEffect, useId, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useApiHealth } from "@/components/shell/api-health";
import { VisualApiError, createVisualComparison } from "@/lib/visual-api";
import type { SizePolicy, VisualResult } from "@/lib/visual-types";
import { cn } from "@/lib/utils";

/** Client-side checks are only for fast feedback. The server validates everything again. */
const ACCEPT = ["image/png", "image/jpeg", "image/webp"];
const MAX_MB = 15;

function checkFile(f: File): string | null {
  if (!ACCEPT.includes(f.type)) return "Use a PNG, JPEG or WebP image.";
  if (f.size > MAX_MB * 1024 * 1024) return `This file is larger than ${MAX_MB} MB.`;
  return null;
}

function ImageDrop({ label, file, onFile }: { label: string; file: File | null; onFile: (f: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const errId = useId();

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = (f: File | undefined) => {
    if (!f) return;
    const problem = checkFile(f);
    setError(problem);
    onFile(problem ? null : f);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          accept(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex min-h-40 flex-col items-center justify-center gap-2 rounded-panel border border-dashed p-3 text-center transition-colors duration-150",
          over ? "border-accent bg-accent-soft" : "border-line-strong",
        )}
      >
        {preview && file ? (
          <>
            {/* Local preview of the chosen file; no optimisation wanted. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={`${label} preview`} className="max-h-24 max-w-full rounded-control border border-line object-contain" />
            <p className="max-w-full truncate text-small text-fg" title={file.name}>
              {file.name}
            </p>
            <p className="text-small text-fg-3">{(file.size / 1024).toFixed(0)} KB</p>
          </>
        ) : (
          <>
            <ImagePlus className="size-5 text-fg-3" aria-hidden />
            <p className="text-small text-fg-2">Drop an image here</p>
          </>
        )}
        <Button size="sm" onClick={() => inputRef.current?.click()} aria-describedby={error ? errId : undefined}>
          {file ? `Change ${label.toLowerCase()} image` : `Choose ${label.toLowerCase()} image`}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label={`${label} image file`}
          data-testid={`file-${label.toLowerCase()}`}
          onChange={(e) => {
            accept(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <p className="mt-1 text-small font-medium text-fg-2">{label}</p>
      {error && (
        <p id={errId} role="alert" className="mt-0.5 text-small text-removed">
          {error}
        </p>
      )}
    </div>
  );
}

const SIZE_OPTIONS = [
  { value: "pad", label: "Keep sizes (no scaling)" },
  { value: "resize", label: "Resize after to match before" },
] as const satisfies readonly { value: SizePolicy; label: string }[];

export function NewComparisonDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (result: VisualResult) => void;
}) {
  const api = useApiHealth();
  const [before, setBefore] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [tolerance, setTolerance] = useState("2.3");
  const [policy, setPolicy] = useState<SizePolicy>("pad");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tol = Number(tolerance);
  const tolOk = tolerance.trim() !== "" && Number.isFinite(tol) && tol >= 0 && tol <= 100;
  const offline = api.kind === "offline";
  const canSubmit = Boolean(before && after && tolOk && !busy && api.kind === "online");

  const submit = async () => {
    if (!before || !after) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createVisualComparison(before, after, { before: before.name, after: after.name }, { tolerance: tol, sizePolicy: policy });
      onDone(result); // the parent closes the dialog (via the URL) when it adopts the result
    } catch (err) {
      setError(err instanceof VisualApiError ? err.message : "Something went wrong while comparing.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="pp-fade fixed inset-0 z-40 bg-fg/30" />
        <Dialog.Content className="pp-fade fixed left-1/2 top-1/2 z-50 w-[min(92vw,40rem)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel border border-line bg-surface p-5 shadow-float">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-title font-semibold tracking-tight text-fg">New visual comparison</Dialog.Title>
              <Dialog.Description className="mt-1 text-ui text-fg-2">
                Compare two screenshots. They are analysed by your local PixelProof API and never leave this machine.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" aria-label="Close" disabled={busy}>
                <X className="size-4" aria-hidden />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ImageDrop label="Before" file={before} onFile={setBefore} />
            <ImageDrop label="After" file={after} onFile={setAfter} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tolerance" className="text-small font-medium text-fg-2">
                Tolerance (ΔE)
              </label>
              <Input
                id="tolerance"
                inputMode="decimal"
                value={tolerance}
                onChange={(e) => setTolerance(e.target.value)}
                aria-invalid={!tolOk}
                aria-describedby="tolerance-help"
                className="mt-1"
              />
              <p id="tolerance-help" className="mt-1 text-small text-fg-3">
                0 to 100. Pixels that differ by more than this are counted. About 2.3 is a just-noticeable colour difference.
              </p>
            </div>
            <div>
              <p className="text-small font-medium text-fg-2" id="size-label">
                If the sizes differ
              </p>
              <Segmented label="Size handling" value={policy} onChange={setPolicy} options={SIZE_OPTIONS} className="mt-1 flex-wrap" />
              <p className="mt-1 text-small text-fg-3">Resizing makes pixel-level results unreliable, so it is flagged in the results.</p>
            </div>
          </div>

          {offline && (
            <p role="status" className="mt-4 rounded-control border border-line bg-raised px-3 py-2 text-small text-fg-2">
              The PixelProof API is not reachable, so comparisons cannot run. Start it with scripts\dev.ps1.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-control border border-removed px-3 py-2 text-small text-removed">
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <Button disabled={busy}>Cancel</Button>
            </Dialog.Close>
            <Button variant="primary" onClick={() => void submit()} disabled={!canSubmit} loading={busy}>
              {busy ? "Analysing…" : "Compare"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
