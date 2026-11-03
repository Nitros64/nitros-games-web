import "server-only";
import { cookies, headers } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { authSettings, sessionCookieName } from "./config";
import { readRecord, type Session } from "./store";

export async function currentSession(): Promise<Session | null> {
  const record = await readRecord((await cookies()).get(sessionCookieName())?.value);
  return record?.kind === "session" ? record : null;
}

export function sameOrigin(origin: string | null) { return origin === authSettings().origin; }
export function validCsrf(session: Session, value: unknown) {
  if (typeof value !== "string" || value.length !== session.csrf.length) return false;
  const a = Buffer.from(value), b = Buffer.from(session.csrf);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function mutationSession(form: FormData): Promise<Session | null> {
  if (!sameOrigin((await headers()).get("origin"))) return null;
  const session = await currentSession();
  return session && validCsrf(session, form.get("csrf")) ? session : null;
}
