/** Original landscape drawn on a 480 × 220 grid, using only page and ink tokens.
 * Integer coordinates and crisp edges keep every contour deliberately stepped.
 * Static, server-rendered SVG: no canvas, animation, image requests or client JS.
 */
export function PixelLandscape() {
  return <svg className="pixel-landscape" viewBox="0 0 480 220" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Original pixel landscape: a mountain valley, pine forest, ruined watchtower and winding river" shapeRendering="crispEdges">
    <defs>
      <pattern id="land-dither" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="currentColor" /><rect x="2" y="2" width="1" height="1" fill="currentColor" /></pattern>
      <pattern id="land-rock" width="12" height="8" patternUnits="userSpaceOnUse"><path d="M1 2h4v1H1zM8 6h3v1H8z" fill="var(--page)" /></pattern>
      <g id="land-pine"><path d="M8 0h2v4h2v3h2v3h2v3h-4v2h4v3h2v3h-7v7H7v-7H0v-3h2v-3h4v-2H2v-3h2V7h2V4h2z" fill="currentColor" /><path d="M8 7h2v2H8zM6 12h3v1H6zM4 18h4v1H4zM9 23h1v4H9z" fill="var(--page)" /></g>
      <g id="land-cloud" fill="currentColor"><path d="M0 8h5V4h7V1h12v3h6v4h8v2H0z" /><path d="M5 8h27v1H5z" fill="var(--page)" /></g>
      <g id="land-grass" fill="currentColor"><path d="M0 3h2v2h2V0h2v5h2V3h2v4H0z" /></g>
    </defs>
    <rect width="480" height="220" fill="var(--page)" />
    <g fill="currentColor"><path d="M379 23h14v3h4v4h3v14h-3v4h-4v3h-14v-3h-4v-4h-3V30h3v-4h4z" /><path d="M32 27h4v1h-4zM73 55h4v1h-4zM331 19h2v2h-2zM436 54h2v2h-2z" /></g>
    <use href="#land-cloud" x="37" y="38" /><use href="#land-cloud" x="405" y="65" /><use href="#land-cloud" x="304" y="58" />
    <path d="M0 104h12V96h12V86h12V77h12V66h12V57h12v9h12v12h12v10h12v11h16v13h16v-8h12V94h12V84h12v10h12v12h12v15h16v-9h16v-8h12V92h12V80h12V68h12V58h12V48h12V38h12v12h12v14h12v12h12v12h12v12h12v-9h12V80h12V71h12V60h12v11h12v14h12v12h12v14h12v20H0z" fill="url(#land-dither)" />
    <path d="M0 104h12V96h12V86h12V77h12V66h12V57h12v9h12v12h12v10h12v11h16v13h16M216 121v-9h16v-8h12V92h12V80h12V68h12V58h12V48h12V38h12v12h12v14h12v12h12v12h12v12h12" fill="none" stroke="currentColor" strokeWidth="1" />
    <path d="M60 66h12v9h8v9h8v7H76v-6H65v-8h-8zM298 49h12v7h8v12h8v7h-12v-8h-9v-7h-12z" fill="currentColor" />
    <path d="M0 137h20v-5h24v6h20v-4h24v7h28v-6h22v8h28v-5h32v8h30v-8h24v-6h30v-5h26v6h24v-7h30v9h28v-6h26v8h30v-4h24v7h20v80H0z" fill="currentColor" />
    <path d="M210 141h33v5h-12v5h-11v5h-9v5h-8v5h17v5h22v5h17v6h12v6h-5v6h-15v6h-24v6h-25v7h-15v7h-66v-7h25v-7h27v-7h25v-7h19v-7h-6v-6h-20v-6h-16v-6h-6v-7h11v-6h15v-6h12z" fill="var(--page)" />
    <g fill="var(--page)"><path d="M4 153h70v1H4zM53 160h64v1H53zM273 150h82v1h-82zM326 163h91v1h-91zM269 176h33v1h-33zM209 152h10v1h-10z" /><path d="M34 146h3v2h-3zM98 150h4v1h-4zM292 145h4v2h-4zM370 155h4v1h-4z" /></g>
    <g><use href="#land-pine" x="10" y="111" /><use href="#land-pine" x="27" y="118" /><use href="#land-pine" x="57" y="108" /><use href="#land-pine" x="76" y="116" /><use href="#land-pine" x="345" y="111" /><use href="#land-pine" x="366" y="107" /><use href="#land-pine" x="389" y="118" /><use href="#land-pine" x="412" y="109" /><use href="#land-pine" x="438" y="114" /><use href="#land-pine" x="462" y="105" /></g>
    <g fill="currentColor"><path d="M100 126V93h-3V79h6v5h6v-5h6v5h6v-5h6v14h-3v33z" /><path d="M97 127h31v5H97zM110 78V58h2v20zM112 58h17v10h-17z" /></g>
    <g fill="var(--page)"><path d="M108 97h7v10h-7zM108 116h7v12h-7zM103 89h4v2h-4zM116 92h5v2h-5zM118 112h4v2h-4zM102 108h3v2h-3zM112 60h12v2h-12z" /></g>
    <path d="M0 177h18v-5h25v6h26v6h35v7h22v29H0zM312 220v-24h17v-8h28v-5h24v-8h27v-4h24v7h25v-6h23v48z" fill="var(--page)" />
    <path d="M0 186h20v-5h22v6h27v6h35v7h22v20H0zM312 220v-15h17v-8h28v-5h24v-8h27v-4h24v7h25v-6h23v39z" fill="currentColor" />
    <path d="M0 194h70v10h34v16H0zM334 208h25v-6h48v-9h73v27H334z" fill="url(#land-rock)" />
    <use href="#land-pine" transform="translate(4 127) scale(2)" /><use href="#land-pine" transform="translate(442 128) scale(2)" /><use href="#land-pine" x="41" y="152" /><use href="#land-pine" x="407" y="150" />
    <use href="#land-grass" x="77" y="179" /><use href="#land-grass" x="357" y="181" /><use href="#land-grass" x="325" y="193" />
    <g fill="var(--page)"><path d="M282 162h5v2h2v5h-2v5h3v2h-5v-4h-2v4h-4v-2h2v-6h-2v-3h3zM293 165h1v12h-1z" /><path d="M145 181h8v1h-8zM151 185h4v1h-4zM271 204h8v1h-8zM262 210h4v1h-4z" /></g>
  </svg>;
}
