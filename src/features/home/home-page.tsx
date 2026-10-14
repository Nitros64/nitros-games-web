import Link from "next/link";
import { PixelIcon } from "@/components/pixel-icon";
import { RetroWindow } from "@/components/retro-window";
import { LivingScene } from "./living-scene";

export function HomePage() {
  return <main id="main">
    <section className="world-hero" aria-labelledby="hero-title">
      <div className="world-status"><span>NITROS SYSTEM / WORLD 01</span><span>INDEPENDENT GAMES. INFINITE CURIOSITY.</span></div>
      <div className="living-hero">
        <LivingScene />
        <div className="hero-interface content-width">
          <div className="hero-intro">
            <p className="eyebrow">NITROS GAMES / PRESS START</p>
            <h1 id="hero-title">PLAY BEYOND<br />THE FAMILIAR.</h1>
            <p>Original worlds for the endlessly curious.</p>
            <Link className="button primary" href="#games"><PixelIcon name="arrow" />EXPLORE GAMES</Link>
          </div>
          <div className="hero-windows">
            <RetroWindow title="01 / NEXT ADVENTURE" icon="games" status="STATUS / IN DEVELOPMENT" action={<Link href="#games" aria-label="View upcoming games"><PixelIcon name="arrow" /></Link>}>
              <span className="window-kicker">A NEW CHAPTER</span><h2>COMING SOON</h2><p>Our first adventures are still taking shape. No released games or dates to announce.</p>
            </RetroWindow>
            <RetroWindow title="02 / STUDIO SIGNAL" icon="studio" status="INDEPENDENT / PLAYER AT HEART" className="signal-window">
              <p>Original worlds.<br />A familiar love of play.</p>
            </RetroWindow>
          </div>
        </div>
        <div className="scene-caption" aria-hidden="true"><span>SECTOR 01 — UNCHARTED</span><span>SCROLL TO EXPLORE ↓</span></div>
      </div>
    </section>
    <section id="games" className="games-section content-width" aria-labelledby="games-title">
      <div className="section-heading"><span className="eyebrow">01 / SELECT A GAME</span><h2 id="games-title">OUR GAMES</h2><span className="eyebrow">SLOTS FILLED: 00</span></div>
      <div className="game-empty"><div className="empty-cartridge" aria-hidden="true"><PixelIcon name="games" /><span>?</span></div><div><p className="eyebrow">NO CARTRIDGE INSERTED</p><h3>COMING SOON</h3><p>Every adventure starts somewhere. Ours is just beginning.<br />No released games or launch dates yet. When something is ready to play, you’ll find it here.</p><span className="empty-status">[ WORK IN PROGRESS ]</span></div></div>
    </section>
    <section className="content-width" aria-labelledby="studio-title">
      <RetroWindow title="02 / STUDIO INFO" icon="studio"><div className="panel-body"><div className="studio-emblem" aria-hidden="true"><PixelIcon name="home" /><span>LEVEL 01</span></div><div><p className="eyebrow">A NOTE FROM THE STUDIO</p><h2 id="studio-title">SMALL PIXELS.<br />BIG POSSIBILITIES.</h2><p>We’re Nitros Games, an independent studio with a soft spot for the worlds that fit in the palm of your hand. We’re chasing that same sense of discovery, one new idea at a time.</p><Link className="text-link" href="/studio">MEET THE STUDIO <PixelIcon name="arrow" /></Link></div></div></RetroWindow>
    </section>
    <section id="contact" className="contact-panel content-width" aria-labelledby="contact-title"><PixelIcon name="contact" /><div><h2 id="contact-title">KEEP IN TOUCH</h2><p>Our public contact channel isn’t open yet. Studio news and future ways to reach us will appear here.</p></div><span className="eyebrow">CHANNEL / STANDBY</span></section>
  </main>;
}

