import "server-only";
import type { Metadata } from "next";
import { one } from "@/server/db";
import { getDict } from "./i18n";
import { DEFAULT_LOCALE, alternatesFor, localePath, ogLocale, type Locale } from "./i18n/config";
import { SITE } from "./site";

type Fallback = { title: string; description: string };

/**
 * Page metadata: the texts typed in the admin panel (Contenuti SEO) win,
 * the defaults written in code are used for anything left empty.
 */
export async function pageMetadata(slug: string, path: string, lang: Locale = DEFAULT_LOCALE): Promise<Metadata> {
  const fallback: Fallback = getDict(lang).seo.pages[slug] ?? getDict(DEFAULT_LOCALE).seo.pages[slug];
  // The home page is built ahead of time, possibly where no database exists yet:
  // then the defaults below are used, and the page is rebuilt when the SEO text is saved.
  // The texts typed in the admin panel are Italian: they only apply to the Italian page.
  const row =
    lang === DEFAULT_LOCALE
      ? await one<{ title: string; description: string }>(`SELECT title, description FROM seo_pages WHERE slug = $1`, [slug]).catch(() => null)
      : null;
  const title = row?.title?.trim() || fallback.title;
  const description = row?.description?.trim() || fallback.description;
  const url = localePath(lang, path);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, languages: alternatesFor(path) },
    // the page-level openGraph replaces the one from the app folder, so the share images are named again here
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: SITE.name,
      locale: ogLocale(lang),
      images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: SITE.name }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/twitter-image.jpg"] },
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbLd(items: Crumb[], lang: Locale = DEFAULT_LOCALE) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE.url}${localePath(lang, c.path)}`,
    })),
  };
}
