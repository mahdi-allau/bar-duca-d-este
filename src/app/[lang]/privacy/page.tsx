import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { getDict, langOf } from "@/lib/i18n";
import { alternatesFor, localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { SITE } from "@/lib/site";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params);
  return {
    title: getDict(lang).seo.privacyTitle,
    alternates: { canonical: localePath(lang, "/privacy"), languages: alternatesFor("/privacy") },
    robots: { index: false, follow: true },
  };
}

export default async function Privacy({ params }: Props) {
  const lang = await langOf(params);
  const d = getDict(lang);
  const t = d.pages.privacy;
  const vars = {
    name: SITE.name,
    address: `${SITE.street}, ${SITE.postalCode} ${SITE.city}, ${d.common.country}`,
    email: SITE.email,
    phone: SITE.phone,
  };
  return (
    <>
      <PageHero
        lang={lang}
        title={t.title}
        crumbs={[
          { name: d.pages.crumbs.home, path: "/" },
          { name: d.pages.crumbs.privacy, path: "/privacy" },
        ]}
      />
      <section className="section bg-ivory text-espresso">
        <div className="wrap max-w-3xl space-y-6">
          <p className="rounded border border-gold/50 bg-cream p-4 text-sm">{t.draft}</p>
          {t.sections.map((s) => (
            <div key={s.h} className="space-y-6">
              <h2 className="t-h3">{s.h}</h2>
              <p>{fmt(s.p, vars)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
