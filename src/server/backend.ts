import "server-only";

/** BACKEND_URL is an origin, configured by the server's deployment environment. */
export function backendOrigin(): URL | null {
  const configured =
    process.env.BACKEND_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:8080"
      : undefined);
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    return url;
  } catch {
    return null;
  }
}
