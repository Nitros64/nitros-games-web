import "server-only";

export type DataError =
  | { kind: "configuration" }
  | { kind: "unavailable" }
  | { kind: "timeout" }
  | { kind: "http"; status: number }
  | { kind: "invalid-data" };

export type Result<T> = { ok: true; data: T } | { ok: false; error: DataError };

/** Public JSON reads only: no credentials, redirects or persistent cache. */
export async function getJson<T>(
  url: URL,
  decode: (value: unknown) => T | null,
): Promise<Result<T>> {
  const signal = AbortSignal.timeout(5_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
      redirect: "manual",
      signal,
    });
    if (!response.ok)
      return { ok: false, error: { kind: "http", status: response.status } };
    const mediaType = response.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    if (mediaType !== "application/json")
      return { ok: false, error: { kind: "invalid-data" } };
    let value: unknown;
    try {
      value = await response.json();
    } catch {
      return {
        ok: false,
        error: { kind: signal.aborted ? "timeout" : "invalid-data" },
      };
    }
    const data = decode(value);
    return data === null
      ? { ok: false, error: { kind: "invalid-data" } }
      : { ok: true, data };
  } catch {
    return {
      ok: false,
      error: { kind: signal.aborted ? "timeout" : "unavailable" },
    };
  }
}
