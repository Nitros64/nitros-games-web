import "server-only";
import { backendOrigin } from "./backend";
import type { Result } from "./http";
import type { Session } from "./auth/store";

export async function adminRequest<T>(session: Session, path: string, decode: (data: unknown) => T | null,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET", body?: unknown): Promise<Result<T>> {
  const origin = backendOrigin();
  if (!origin) return { ok: false, error: { kind: "configuration" } };
  const signal = AbortSignal.timeout(5000);
  try {
    const response = await fetch(new URL(path, origin), {
      method, headers: { Accept: "application/json", Authorization: `Bearer ${session.accessToken}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store", redirect: "manual", credentials: "omit", signal,
    });
    if (!response.ok) return { ok: false, error: { kind: "http", status: response.status } };
    let value: unknown = undefined;
    if (response.status !== 204) {
      if (response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return { ok: false, error: { kind: "invalid-data" } };
      try { value = await response.json(); } catch { return { ok: false, error: { kind: signal.aborted ? "timeout" : "invalid-data" } }; }
    }
    const data = decode(value);
    return data === null ? { ok: false, error: { kind: "invalid-data" } } : { ok: true, data };
  } catch { return { ok: false, error: { kind: signal.aborted ? "timeout" : "unavailable" } }; }
}
