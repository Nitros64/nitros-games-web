import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as oidc from "openid-client";
import { authSettings, cookieOptions, sessionCookieName } from "@/server/auth/config";
import { oidcClient } from "@/server/auth/oidc";
import { deleteRecord } from "@/server/auth/store";
import { currentSession, sameOrigin, validCsrf } from "@/server/auth/session";

export async function POST(request: Request) {
  const settings = authSettings();
  if (!sameOrigin(request.headers.get("origin"))) return new Response("Forbidden", { status: 403 });
  const session = await currentSession();
  if (session && !validCsrf(session, (await request.formData()).get("csrf"))) return new Response("Forbidden", { status: 403 });
  const jar = await cookies();
  await deleteRecord(jar.get(sessionCookieName())?.value);
  jar.set(sessionCookieName(), "", cookieOptions(0));
  if (session) {
    try {
      const url = oidc.buildEndSessionUrl(await oidcClient(), { id_token_hint: session.idToken,
        post_logout_redirect_uri: new URL("/admin/login", settings.origin).href });
      return NextResponse.redirect(url, 303);
    } catch { /* Local session is already revoked even when the provider is unavailable. */ }
  }
  return NextResponse.redirect(new URL("/admin/login?loggedOut=1", settings.origin), 303);
}
