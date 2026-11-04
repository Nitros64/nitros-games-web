import "server-only";
import Image from "next/image";
import { randomUUID } from "node:crypto";
import { publicMedia } from "./data";
import { imagePath } from "./contracts";

export async function PublicGallery({ gameId, name }: { gameId: number; name: string }) {
  const result = await publicMedia(gameId);
  if (!result.ok) return <section aria-label="Game images"><p role="status">Images are unavailable right now.</p></section>;
  const cover = result.data.find(item => item.type === "COVER"), screenshots = result.data.filter(item => item.type === "SCREENSHOT");
  const revision = randomUUID();
  return <section aria-label="Game images">
    {cover ? <figure><Image unoptimized src={`${imagePath(gameId, cover.id)}?revision=${revision}`} alt={cover.altText || `Cover for ${name}`} width={cover.width} height={cover.height} style={{ width: "100%", maxWidth: 900, height: "auto" }} />
      {cover.caption && <figcaption>{cover.caption}</figcaption>}</figure> : <p>No cover available yet.</p>}
    <h2>SCREENSHOTS</h2>
    {!screenshots.length ? <p>No screenshots available yet.</p> : <ul className="admin-list">{screenshots.map(item => <li key={item.id}>
      <figure><a href={imagePath(gameId, item.id)} target="_blank" rel="noopener noreferrer" aria-label={`View screenshot ${item.position} in a new tab`}>
        <Image unoptimized src={`${imagePath(gameId, item.id)}?revision=${revision}`} alt={item.altText || `${name} — screenshot ${item.position}`} width={item.width} height={item.height} style={{ width: "100%", maxWidth: 640, height: "auto" }} />
      </a>{item.caption && <figcaption>{item.caption}</figcaption>}</figure>
    </li>)}</ul>}
  </section>;
}
