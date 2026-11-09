import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";
import { fontVariables } from "../fonts";
import "../globals.css";

/**
 * The admin can be added to the phone's home screen and opened like an app (no browser bars).
 * The manifest lives outside /admin on purpose: everything under /admin needs a login.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "Amministrazione", template: "%s · Amministrazione Duca d'Este" },
  robots: { index: false, follow: false },
  applicationName: "Duca d'Este",
  manifest: "/admin-app/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/admin-app/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/admin-app/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/admin-app/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Duca d'Este", statusBarStyle: "black" },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = { themeColor: "#171715", colorScheme: "light" };

export default function AdminRoot({ children }: { children: ReactNode }) {
  // The admin area is its own root layout: always Italian, always left to right.
  return (
    <html lang="it" className={fontVariables}>
      <body>
        <div className="min-h-screen bg-[#f3efe6] font-sans text-[15px] leading-normal text-ink">{children}</div>
      </body>
    </html>
  );
}
