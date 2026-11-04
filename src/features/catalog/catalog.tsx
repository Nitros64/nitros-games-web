import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { PixelIcon } from "@/components/pixel-icon";
import { RetroWindow } from "@/components/retro-window";
import { getCatalog } from "./get-catalog";

export function Catalog() {
  return (
    <section
      id="games"
      className="games-section content-width"
      aria-labelledby="games-title"
    >
      <div className="section-heading">
        <span className="eyebrow">01 / SELECT A GAME</span>
        <h2 id="games-title">OUR GAMES</h2>
        <form action="/#games" method="get">
          <button className="text-link" type="submit">
            REFRESH CATALOG
          </button>
        </form>
      </div>
      <noscript>
        <p className="catalog-message">
          Enable JavaScript to view the game catalog.
        </p>
      </noscript>
      <Suspense
        fallback={
          <p className="catalog-message" role="status">
            LOADING CARTRIDGES…
          </p>
        }
      >
        <CatalogContent />
      </Suspense>
    </section>
  );
}

async function CatalogContent() {
  // Publication changes must be read on a real request, never baked into the shell or a prefetch.
  await connection();
  const result = await getCatalog();
  if (!result.ok) {
    const message =
      result.error.kind === "invalid-data"
        ? "The catalog response could not be read. Please try again later."
        : "We can’t load the games right now. Please try again in a moment.";
    return (
      <div className="game-empty" role="status">
        <PixelIcon name="games" />
        <div>
          <p className="eyebrow">SIGNAL INTERRUPTED</p>
          <h3>CATALOG UNAVAILABLE</h3>
          <p>{message}</p>
        </div>
      </div>
    );
  }
  if (result.data.length === 0)
    return (
      <div className="game-empty">
        <div className="empty-cartridge" aria-hidden="true">
          <PixelIcon name="games" />
          <span>?</span>
        </div>
        <div>
          <p className="eyebrow">NO CARTRIDGE INSERTED</p>
          <h3>COMING SOON</h3>
          <p>
            No published games yet. When something is ready to share, you’ll
            find it here.
          </p>
          <span className="empty-status">[ SLOTS FILLED: 00 ]</span>
        </div>
      </div>
    );
  return (
    <>
      <p className="eyebrow catalog-message">
        SLOTS FILLED: {String(result.data.length).padStart(2, "0")}
      </p>
      <ul className="catalog-grid" aria-label="Published games">
        {result.data.map((game) => (
          <li key={game.id}>
            <article aria-labelledby={`game-${game.id}`}>
              <RetroWindow
                title="GAME / PUBLISHED"
                icon="games"
                status={game.jam ? "GAME JAM" : "INDEPENDENT GAME"}
              >
                <div className="catalog-details">
                  <h3 id={`game-${game.id}`}>{game.name}</h3>
                  <p>{game.description}</p>
                  <Link className="text-link" href={`/games/${game.id}`}>VERSIONS & DOWNLOADS</Link>
                  <p className="eyebrow">
                    {game.developerCount}{" "}
                    {game.developerCount === 1 ? "DEVELOPER" : "DEVELOPERS"}
                  </p>
                </div>
              </RetroWindow>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
