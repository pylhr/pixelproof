import { API_URL } from "./api";
import type { SizePolicy, VisualParams, VisualResult } from "./visual-types";

export class VisualApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "VisualApiError";
  }
}

const ANALYSIS_TIMEOUT_MS = 120_000;

async function toError(res: Response): Promise<VisualApiError> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    const d = body.detail;
    if (d && typeof d === "object" && !Array.isArray(d)) {
      const { code, message } = d as Record<string, unknown>;
      if (typeof code === "string" && typeof message === "string") return new VisualApiError(res.status, code, message);
    }
    if (Array.isArray(d)) return new VisualApiError(res.status, "invalid_request", "One of the settings is out of range.");
  } catch {
    /* fall through to the generic message */
  }
  return new VisualApiError(res.status, "http_error", `The server returned HTTP ${res.status}.`);
}

async function request(path: string, init?: RequestInit): Promise<VisualResult> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS) });
  } catch {
    throw new VisualApiError(0, "network", "Could not reach the PixelProof API. Is it running?");
  }
  if (!res.ok) throw await toError(res);
  return (await res.json()) as VisualResult;
}

export interface CompareOptions {
  tolerance?: number;
  sizePolicy?: SizePolicy;
}

export function createVisualComparison(before: File | Blob, after: File | Blob, names: { before: string; after: string }, opts: CompareOptions = {}) {
  const form = new FormData();
  form.append("before", before, names.before);
  form.append("after", after, names.after);
  if (opts.tolerance !== undefined) form.append("tolerance", String(opts.tolerance));
  if (opts.sizePolicy) form.append("size_policy", opts.sizePolicy);
  return request("/api/comparisons/visual", { method: "POST", body: form });
}

export function rerunVisualComparison(id: string, params: VisualParams) {
  return request(`/api/comparisons/visual/${id}/rerun`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export function getVisualComparison(id: string) {
  return request(`/api/comparisons/visual/${id}`);
}

export async function listVisualComparisons(): Promise<VisualResult[]> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/comparisons/visual`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  } catch {
    throw new VisualApiError(0, "network", "Could not reach the PixelProof API.");
  }
  if (!res.ok) throw await toError(res);
  return ((await res.json()) as { items: VisualResult[] }).items;
}

export const artifactUrl = (path: string) => `${API_URL}${path}`;

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download a server artifact. Fetched as a blob because `download` is ignored cross-origin. */
export async function downloadArtifact(path: string, filename: string) {
  const res = await fetch(artifactUrl(path), { cache: "no-store" });
  if (!res.ok) throw await toError(res);
  saveBlob(await res.blob(), filename);
}

export function downloadJson(data: unknown, filename: string) {
  saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename);
}
