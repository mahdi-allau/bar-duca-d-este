import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import Contact from "@/components/Contact";
import Header from "@/components/Header";
import SmoothScroll from "@/components/SmoothScroll";
import { getDict } from "@/lib/i18n";
import { LangProvider } from "@/lib/i18n/client";
import { LOCALES, alternatesFor, dirOf, isLocale, localePath, ogLocale } from "@/lib/i18n/config";
import { SITE } from "@/lib/site";
import { fontVariables } from "../fonts";
import "../globals.css";

// Only the languages we have: anything else under /xx is a 404.
export const dynamicParams = false;
export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }));

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDict(lang).seo;
  return {
    metadataBase: new URL(SITE.url),
    title: { default: d.siteTitle, template: `%s | ${d.suffix}` },
    description: d.siteDescription,
    applicationName: SITE.name,
    keywords: d.keywords,
    alternates: { canonical: localePath(lang, "/"), languages: alternatesFor("/") },
    openGraph: {
      type: "website",
      locale: ogLocale(lang),
      url: localePath(lang, "/"),
      siteName: SITE.name,
      title: d.siteTitle,
      description: d.siteDescription,
      images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: SITE.name }],
    },
    twitter: { card: "summary_large_image", title: d.siteTitle, description: d.siteDescription, images: ["/twitter-image.jpg"] },
    robots: { index: true, follow: true },
    formatDetection: { telephone: true, email: true, address: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#171715",
  colorScheme: "light",
};

export default async function SiteLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const d = getDict(lang);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "CafeOrCoffeeShop", "Bakery"],
    "@id": `${SITE.url}/#business`,
    name: SITE.name,
    alternateName: "Duca d'Este",
    description: d.seo.businessDescription,
    inLanguage: lang,
    url: `${SITE.url}${localePath(lang, "/")}`,
    image: [`${SITE.url}/logo-seal.png`, `${SITE.url}/foto/tavolo-marmo.webp`],
    logo: `${SITE.url}/logo-seal.png`,
    telephone: SITE.phone,
    email: SITE.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.street,
      postalCode: SITE.postalCode,
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      addressCountry: SITE.country,
    },
    hasMap: SITE.mapsPlace,
    sameAs: [SITE.tripadvisor],
  };

  return (
    <html lang={lang} dir={dirOf(lang)} className={fontVariables}>
      <body>
        <LangProvider lang={lang} common={d.common}>
          <a
            href="#main"
            className="fixed start-4 top-4 z-[70] -translate-y-24 bg-ivory px-5 py-3 text-sm font-semibold text-ink focus:translate-y-0"
          >
            {d.common.skip}
          </a>
          <SmoothScroll />
          <Header />
          <main id="main">{children}</main>
          <Contact lang={lang} />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
          />
        </LangProvider>
      </body>
    </html>
  );
}
