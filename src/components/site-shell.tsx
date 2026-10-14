import Image from "next/image";
import Link from "next/link";
import logo from "../../public/brand/nitros_games_logo.webp";
import { ThemeControls } from "@/theme/theme-controls";
import { PixelIcon, type PixelIconName } from "./pixel-icon";

function NavItem({ href, icon, children }: { href: string; icon: PixelIconName; children: React.ReactNode }) {
  return <Link className="nav-item" href={href}><PixelIcon name={icon} /><span>{children}</span></Link>;
}
export function SiteHeader() {
  return <header className="site-header">
    <nav className="game-nav" aria-label="Main navigation">
      <NavItem href="/" icon="home">HOME</NavItem>
      <NavItem href="/#games" icon="games">GAMES</NavItem>
      <Link className="brand" href="/" aria-label="Nitros Games home"><Image src={logo} alt="Nitros Games" priority sizes="(max-width: 600px) 160px, 240px" /></Link>
      <NavItem href="/studio" icon="studio">STUDIO</NavItem>
      <NavItem href="/#contact" icon="contact">CONTACT</NavItem>
    </nav>
    <div className="appearance-bar"><ThemeControls /></div>
  </header>;
}
export function SiteFooter() {
  return <footer className="site-footer"><Link className="footer-brand" href="/">NITROS GAMES</Link><p>Small pixels. Endless possibility.</p><a className="back-top" href="#main">BACK TO TOP ↑</a></footer>;
}

