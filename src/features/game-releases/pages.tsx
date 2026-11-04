import "server-only";
import Link from "next/link";
import { AdminFrame, requireSession } from "@/features/admin-games/pages";
import { getAdminGame, errorMessage } from "@/features/admin-games/data";
import { parseId } from "@/features/admin-games/contracts";
import { versions, version, downloads, releaseOptions, hosts } from "./data";
import { VersionForm, DownloadForm, DeleteForm } from "./forms";

export async function VersionsPage({ gameId: rawGameId, versionId: rawVersionId }: { gameId: string; versionId?: string }) {
  const session = await requireSession();
  const gameId = parseId(rawGameId), versionId = parseId(rawVersionId);
  const failure = (message: string) => <AdminFrame title="VERSIONS & DOWNLOADS" csrf={session.csrf}><p role="alert">{message}</p></AdminFrame>;
  if (!gameId || (rawVersionId !== undefined && !versionId)) return failure("Invalid resource identifier.");
  const game = await getAdminGame(session, gameId);
  if (!game.ok) return failure(errorMessage(game.error));
  const options = await releaseOptions(session);
  if (!options.ok) return failure(errorMessage(options.error));
  if (!versionId) {
    const result = await versions(session, gameId);
    if (!result.ok) return failure(errorMessage(result.error));
    return <AdminFrame title={`VERSIONS / ${game.data.name}`} csrf={session.csrf}>
      <Link href={`/admin/${gameId}`} className="text-link">BACK TO GAME</Link>
      <p className="eyebrow">STATUS / {game.data.publicationStatus}</p>
      {!result.data.length ? <p>No versions yet.</p> : <ul className="admin-list">{result.data.map(item => <li key={item.id}>
        <Link href={`/admin/${gameId}/versions/${item.id}`}>{item.name}</Link>
      </li>)}</ul>}
      <h2>CREATE VERSION</h2><VersionForm gameId={gameId} options={options.data} csrf={session.csrf} />
    </AdminFrame>;
  }
  const item = await version(session, gameId, versionId);
  if (!item.ok) return failure(errorMessage(item.error));
  const [links, servers] = await Promise.all([downloads(session, gameId, versionId), hosts(session)]);
  if (!links.ok) return failure(errorMessage(links.error)); if (!servers.ok) return failure(errorMessage(servers.error));
  return <AdminFrame title={`VERSION / ${item.data.name}`} csrf={session.csrf}>
    <Link className="text-link" href={`/admin/${gameId}/versions`}>ALL VERSIONS</Link>
    <p className="eyebrow">{game.data.name} / {game.data.publicationStatus}</p>
    <VersionForm key={JSON.stringify(item.data)} gameId={gameId} version={item.data} options={options.data} csrf={session.csrf} />
    <h2>DOWNLOAD LINKS</h2>
    {!links.data.length ? <p>No download links yet.</p> : links.data.map(link => <section className="release-download" key={JSON.stringify(link)} aria-label={`Download ${link.id}`}>
      <h3>{servers.data.find(server => server.id === link.serverHostImageId)?.name ?? "Download server"}</h3>
      <DownloadForm gameId={gameId} versionId={versionId} download={link} hosts={servers.data} csrf={session.csrf} />
      <DeleteForm gameId={gameId} versionId={versionId} linkId={link.id} confirmation={link.link} csrf={session.csrf} />
    </section>)}
    <h3>ADD DOWNLOAD</h3><DownloadForm key={links.data.map(link => link.id).join(",")} gameId={gameId} versionId={versionId} hosts={servers.data} csrf={session.csrf} />
    <DeleteForm gameId={gameId} versionId={versionId} confirmation={item.data.name} csrf={session.csrf} />
  </AdminFrame>;
}
