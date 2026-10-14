import type { Metadata } from "next";
import localFont from "next/font/local";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import { themeScript } from "@/theme/config";
import "./globals.css";

const pixelFont = localFont({ src: "../../public/fonts/Tiny5.ttf", variable: "--font-pixel", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Nitros Games — New worlds. Old-school soul.",
    template: "%s | Nitros Games",
  },
  description:
    "An independent game studio with a love for the golden eras of play. Something new is taking shape. No games released yet — stay curious.",
};
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={pixelFont.variable}
      data-theme="retro-mix"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
