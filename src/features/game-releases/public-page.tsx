import "server-only";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { RetroWindow } from "@/components/retro-window";
import { backendOrigin } from "@/server/backend";
import { getJson, type Result } from "@/server/http";
import { decodeGame } from "@/features/catalog/game";
import { parseId, decodeGenres as decodeOptions } from "@/features/admin-games/contracts";
import { decodeVersions, decodeDownloads } from "./contracts";
import { PublicGallery } from "@/features/game-media/public-gallery";

export async function PublicReleases({ rawId }: { rawId: string }) {
  await connection();
  const id = parseId(rawId); if (!id) notFound();
  const origin = backendOrigin();
  const unavailable = () => <main id="main" className="content-width admin-page"><h1>DOWNLOADS UNAVAILABLE</h1><p role="status">We cannot load these downloads right now. Please try again later.</p><Link href="/#games">BACK TO GAMES</Link></main>;
  if (!origin) return unavailable();
  const read = <T,>(path: string, decoder: (value: unknown) => T | null): Promise<Result<T>> => getJson(new URL(path, origin), decoder);
  const game = await read(`/api/v1/games/${id}`, decodeGame);
  if (!game.ok) { if (game.error.kind === "http" && game.error.status === 404) notFound(); return unavailable(); }
  if (game.data.id !== id || game.data.publicationStatus !== "PUBLISHED") notFound();
  const [versions, platforms, processors, hosts] = await Promise.all([
    read(`/api/v1/games/${id}/versions`, decodeVersions), read("/api/v1/platforms", decodeOptions),
    read("/api/v1/processors", decodeOptions), read("/api/v1/server-host-images", decodeOptions),
  ]);
  if (!versions.ok || !platforms.ok || !processors.ok || !hosts.ok || versions.data.some(v => v.gameId !== id)) return unavailable();
  const releases = await Promise.all(versions.data.map(async version => ({ version, links: await read(`/api/v1/games/${id}/versions/${version.id}/download-links`, decodeDownloads) })));
  // Reject the complete response if publication changed or a child belongs to another parent.
  if (releases.some(({ version, links }) => !links.ok || links.data.some(link => link.gameVersionId !== version.id))) return unavailable();
  return <main id="main" className="content-width admin-page"><Link className="text-link" href="/#games">BACK TO GAMES</Link>
    <RetroWindow title="GAME / DOWNLOADS" icon="games"><div className="admin-body"><h1>{game.data.name}</h1><p>{game.data.description}</p>
      <PublicGallery gameId={id} name={game.data.name} />
      {!releases.length ? <p>No versions available yet.</p> : releases.map(({ version, links }) => <section className="release-download" key={version.id} aria-label={version.name}>
        <h2>{version.name}</h2><p>{platforms.data.find(p => p.id === version.platformId)?.name ?? "Platform unavailable"} / {processors.data.find(p => p.id === version.processorId)?.name ?? "Processor unavailable"}</p>
        {links.ok && (links.data.length ? <ul>{links.data.map(link => <li key={link.id}>
          <a className="text-link" href={link.link} target="_blank" rel="noopener noreferrer">DOWNLOAD — {hosts.data.find(host => host.id === link.serverHostImageId)?.name ?? "External server"}</a>
        </li>)}</ul> : <p>No download links available yet.</p>)}
      </section>)}
    </div></RetroWindow></main>;
}
