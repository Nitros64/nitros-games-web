import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { RetroWindow } from "@/components/retro-window";
import { authConfigured } from "@/server/auth/config";
import { currentSession } from "@/server/auth/session";
import { errorMessage, getAdminGame, listAdminGames, listGenres } from "./data";
import { GameEditor, GameOperations } from "./forms";
import { parseId } from "./contracts";
import type { ReactNode } from "react";

export async function requireSession() {
  await connection();
  if (!authConfigured()) redirect("/admin/login");
  const session = await currentSession();
  if (!session) redirect("/admin/login?error=session");
  return session;
}

export function AdminFrame({ title, csrf, children }: { title: string; csrf: string; children: ReactNode }) {
  return <main id="main" className="content-width admin-page"><div className="admin-toolbar">
    <Link className="text-link" href="/admin">ALL GAMES</Link><Link className="text-link" href="/">PUBLIC SITE</Link>
    <form action="/auth/logout" method="post"><input type="hidden" name="csrf" value={csrf} /><button>SIGN OUT</button></form>
  </div><RetroWindow title="ADMIN / GAMES" icon="games"><div className="admin-body"><h1>{title}</h1>{children}</div></RetroWindow></main>;
}

export async function AdminList() {
  const session = await requireSession();
  const result = await listAdminGames(session);
  return <AdminFrame title="GAME ADMINISTRATION" csrf={session.csrf}>
    {!result.ok ? <p role="alert">{errorMessage(result.error)}</p> : <>
      <Link className="button primary" href="/admin/new">CREATE GAME</Link>
      {!result.data.length ? <p>No games yet.</p> : <ul className="admin-list">{result.data.map(game => <li key={game.id}>
        <div><h2><Link href={`/admin/${game.id}`}>{game.name}</Link></h2><p>{game.description}</p><span className="eyebrow">{game.publicationStatus}</span></div>
        <Link className="text-link" href={`/admin/${game.id}`} aria-label={`Edit ${game.name}`}>EDIT GAME</Link>
      </li>)}</ul>}
    </>}
  </AdminFrame>;
}

export async function AdminEditor({ id: rawId }: { id?: string }) {
  const session = await requireSession();
  const id = rawId === undefined ? null : parseId(rawId);
  if (rawId !== undefined && id === null) return <AdminFrame title="GAME NOT FOUND" csrf={session.csrf}><p role="alert">Invalid game identifier.</p></AdminFrame>;
  // Authorization comes from Spring Boot, including before showing a creation form.
  const permission = id === null ? await listAdminGames(session) : await getAdminGame(session, id);
  if (!permission.ok) return <AdminFrame title="GAME ADMINISTRATION" csrf={session.csrf}><p role="alert">{errorMessage(permission.error)}</p></AdminFrame>;
  const game = Array.isArray(permission.data) ? undefined : permission.data;
  const genres = await listGenres(session);
  return <AdminFrame title={game ? `EDIT / ${game.name}` : "CREATE GAME"} csrf={session.csrf}>
    {!genres.ok ? <p role="alert">{errorMessage(genres.error)}</p> : <>
      {game && <p className="eyebrow">STATUS / {game.publicationStatus}</p>}
      {game && <Link className="text-link" href={`/admin/${game.id}/versions`}>MANAGE VERSIONS & DOWNLOADS</Link>}
      <GameEditor game={game} genres={genres.data} csrf={session.csrf} />
      {game && <GameOperations game={game} csrf={session.csrf} />}
    </>}
  </AdminFrame>;
}
