/** Minimal typed API client. Types are hand-written for now; generate them from the
 *  FastAPI OpenAPI schema once there is more than one endpoint. */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export interface HealthResponse {
  status: "ok";
  service: string;
  version: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isHealthResponse(data: unknown): data is HealthResponse {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return d.status === "ok" && typeof d.service === "string" && typeof d.version === "string";
}

export async function getHealth(timeoutMs = 3000): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/health`, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new ApiError(res.status, `Health check failed (HTTP ${res.status})`);
  const data: unknown = await res.json();
  if (!isHealthResponse(data)) throw new ApiError(502, "Unexpected /health response shape");
  return data;
}
