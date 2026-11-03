import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as oidc from "openid-client";
import { authSettings, cookieOptions, transactionCookieName } from "@/server/auth/config";
import { oidcClient } from "@/server/auth/oidc";
import { deleteRecord, saveRecord } from "@/server/auth/store";
import { sameOrigin } from "@/server/auth/session";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request.headers.get("origin"))) return new Response("Forbidden", { status: 403 });
    const settings = authSettings();
    const client = await oidcClient();
    const verifier = oidc.randomPKCECodeVerifier();
    const state = oidc.randomState(), nonce = oidc.randomNonce();
    const jar = await cookies();
    await deleteRecord(jar.get(transactionCookieName())?.value);
    const id = await saveRecord({ kind: "transaction", expiresAt: Date.now() + 600_000, verifier, state, nonce });
    const url = oidc.buildAuthorizationUrl(client, {
      redirect_uri: settings.callback, scope: settings.scopes, state, nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: "S256",
    });
    jar.set(transactionCookieName(), id, cookieOptions(600));
    return NextResponse.redirect(url, 303);
  } catch { return new Response("Sign-in is unavailable. Check the server OIDC configuration and try again.", { status: 503 }); }
}
