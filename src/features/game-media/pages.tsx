import "server-only";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { AdminFrame, requireSession } from "@/features/admin-games/pages";
import { parseId } from "@/features/admin-games/contracts";
import { errorMessage, getAdminGame } from "@/features/admin-games/data";
import { adminMedia } from "./data";
import { MediaEditor } from "./forms";

export async function MediaPage({ rawId }: { rawId: string }) {
  const session = await requireSession(); const id = parseId(rawId);
  if (!id) return <AdminFrame title="GAME MEDIA" csrf={session.csrf}><p role="alert">Invalid game identifier.</p></AdminFrame>;
  const game = await getAdminGame(session, id);
  if (!game.ok) return <AdminFrame title="GAME MEDIA" csrf={session.csrf}><p role="alert">{errorMessage(game.error)}</p></AdminFrame>;
  const media = await adminMedia(session, id);
  return <AdminFrame title={`MEDIA / ${game.data.name}`} csrf={session.csrf}>
    <Link className="text-link" href={`/admin/${id}`}>BACK TO GAME</Link><p className="eyebrow">STATUS / {game.data.publicationStatus}</p>
    {!media.ok ? <p role="alert">{errorMessage(media.error)}</p> : <MediaEditor gameId={id} csrf={session.csrf} items={media.data} revision={randomUUID()} />}
  </AdminFrame>;
}
