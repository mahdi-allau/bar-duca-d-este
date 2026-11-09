import Link from "next/link";
import PageHero from "@/components/PageHero";
import ProductGrid from "@/components/ProductGrid";
import { getDict, langOf } from "@/lib/i18n";
import { localePath } from "@/lib/i18n/config";
import { rich } from "@/lib/i18n/format";
import { inlineLink } from "@/lib/i18n/links";
import { pageMetadata } from "@/lib/seo";
import { listProducts } from "@/server/catalog";
import { localizeProducts } from "@/server/localize";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export const generateMetadata = async ({ params }: Props) => pageMetadata("pasticceria", "/pasticceria", await langOf(params));

export default async function Pasticceria({ params }: Props) {
  const lang = await langOf(params);
  const d = getDict(lang);
  const t = d.pages.pasticceria;
  const crumbs = d.pages.crumbs;
  const products = localizeProducts(await listProducts("pasticceria"), lang);
  return (
    <>
      <PageHero
        lang={lang}
        title={t.title}
        lead={t.lead}
        crumbs={[
          { name: crumbs.home, path: "/" },
          { name: crumbs.pasticceria, path: "/pasticceria" },
        ]}
      >
        <Link href={localePath(lang, "/crea-la-tua-torta")} className="btn btn-gold">
          {d.home.ctaCake}
        </Link>
        <Link href={localePath(lang, "/torte-personalizzate")} className="btn btn-line">
          {t.ctaEvents}
        </Link>
      </PageHero>

      <section className="section bg-cream text-espresso">
        <div className="wrap">
          <ProductGrid products={products} path="/pasticceria" lang={lang} />
        </div>
      </section>

      <section className="section bg-ivory text-espresso">
        <div className="wrap grid gap-10 lg:grid-cols-12">
          <h2 className="t-h2 lg:col-span-6">{t.h2}</h2>
          <div className="max-w-[36rem] space-y-5 lg:col-span-5 lg:col-start-8">
            <p>{rich(t.p1, { cake: inlineLink(lang, "/crea-la-tua-torta") })}</p>
            <p>{rich(t.p2, { events: inlineLink(lang, "/torte-personalizzate") })}</p>
          </div>
        </div>
      </section>
    </>
  );
}
