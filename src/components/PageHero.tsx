import Link from "next/link";
import type { ReactNode } from "react";
import { getDict } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/i18n/config";
import { breadcrumbLd, type Crumb } from "@/lib/seo";
import { Ornament } from "./ornaments";

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** Dark title band at the top of every inner page, with breadcrumbs for readers and for Google. */
export default function PageHero({
  lang,
  title,
  lead,
  crumbs,
  children,
}: {
  lang: Locale;
  title: string;
  lead?: string;
  crumbs: Crumb[];
  children?: ReactNode;
}) {
  const label = getDict(lang).common.breadcrumb;
  return (
    <section className="bg-ink pb-16 pt-36 text-ivory md:pb-24 md:pt-44">
      <JsonLd data={breadcrumbLd(crumbs, lang)} />
      <div className="wrap">
        <nav aria-label={label}>
          <ol className="flex flex-wrap items-center gap-x-2 text-sm text-ivory/65">
            {crumbs.map((c, i) => (
              <li key={c.path} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden>/</span>}
                {i < crumbs.length - 1 ? (
                  <Link href={localePath(lang, c.path)} className="link-u">
                    {c.name}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-ivory">
                    {c.name}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="t-h2 mt-8 max-w-[22ch]">{title}</h1>
        <Ornament className="mt-8 text-champagne" />
        {lead && <p className="t-lead mt-8 max-w-[40rem] text-ivory/85">{lead}</p>}
        {children && <div className="mt-10 flex flex-col gap-3.5 sm:flex-row">{children}</div>}
      </div>
    </section>
  );
}
