import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as oidc from "openid-client";
import { authSettings, cookieOptions, sessionCookieName, transactionCookieName } from "@/server/auth/config";
import { oidcClient } from "@/server/auth/oidc";
import { deleteRecord, newId, readRecord, saveRecord } from "@/server/auth/store";

export async function GET(request: Request) {
  const settings = authSettings();
  const jar = await cookies();
  try {
    const transaction = await readRecord(jar.get(transactionCookieName())?.value, true);
    jar.set(transactionCookieName(), "", cookieOptions(0));
    if (transaction?.kind !== "transaction") throw new Error("Invalid transaction");
    // The callback URI is configured, never constructed from untrusted proxy headers.
    const callback = new URL(settings.callback);
    callback.search = new URL(request.url).search;
    const tokens = await oidc.authorizationCodeGrant(await oidcClient(), callback, {
      expectedState: transaction.state, expectedNonce: transaction.nonce, pkceCodeVerifier: transaction.verifier,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    const lifetime = tokens.expires_in;
    if (!claims?.sub || !tokens.id_token || typeof lifetime !== "number" || !Number.isFinite(lifetime) || lifetime <= 5) throw new Error("Missing token lifetime");
    const seconds = Math.floor(Math.min(lifetime - 5, 3600));
    await deleteRecord(jar.get(sessionCookieName())?.value);
    const id = await saveRecord({ kind: "session", expiresAt: Date.now() + seconds * 1000,
      accessToken: tokens.access_token, idToken: tokens.id_token, subject: claims.sub, csrf: newId() });
    jar.set(sessionCookieName(), id, cookieOptions(seconds));
    return NextResponse.redirect(new URL("/admin", settings.origin), 303);
  } catch {
    jar.set(transactionCookieName(), "", cookieOptions(0));
    return NextResponse.redirect(new URL("/admin/login?error=callback", settings.origin), 303);
  }
}
