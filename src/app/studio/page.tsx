import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "The studio" };
export default function Studio() {
  return (
    <main id="main" className="studio-page content-width">
      <p className="eyebrow">HELLO, PLAYER.</p>
      <h1>
        A small beginning.
        <br />
        <em>A world of possibility.</em>
      </h1>
      <p className="hero-description">
        Nitros Games is an independent game studio inspired by the curiosity,
        character, and joy of classic console eras.
      </p>
      <div className="studio-values">
        <article>
          <span className="eyebrow">01 / SPIRIT</span>
          <h2>Play comes first.</h2>
          <p>
            That one-more-try feeling. A surprising discovery. A world you want
            to spend a little longer in. That’s what inspires us.
          </p>
        </article>
        <article>
          <span className="eyebrow">02 / DIRECTION</span>
          <h2>Our own next chapter.</h2>
          <p>
            We’re just getting started. No released titles, no promised dates —
            just an honest space to share what comes next.
          </p>
        </article>
      </div>
      <Link className="button primary" href="/#games">
        Back to what’s next <span aria-hidden="true">→</span>
      </Link>
    </main>
  );
}
