import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { RetroWindow } from "@/components/retro-window";
import { authConfigured } from "@/server/auth/config";

async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const query = await searchParams;
  const configured = authConfigured();
  return <main id="main" className="content-width admin-page"><RetroWindow title="ADMIN / SIGN IN" icon="games"><div className="admin-body">
    <h1>STUDIO ACCESS</h1><p>Sign in with your studio account. Administrator permission is required.</p>
    {query.error && <p role="alert">{query.error === "session" ? "Your session is missing or expired. Please sign in." : "Sign-in could not be completed. Please try again."}</p>}
    {query.loggedOut && <p role="status">You have signed out of this application.</p>}
    {configured ? <form action="/auth/login" method="post"><button className="button primary">SIGN IN</button></form> : <p role="alert">Administrator sign-in is not configured on this server.</p>}
    <Link className="text-link" href="/">BACK TO PUBLIC SITE</Link>
  </div></RetroWindow></main>;
}
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Suspense fallback={<p role="status">Loading sign-in…</p>}><Login searchParams={searchParams} /></Suspense>;
}
