import Link from "next/link";
import PageHero from "@/components/PageHero";
import ProductGrid from "@/components/ProductGrid";
import { getDict, langOf } from "@/lib/i18n";
import { localePath } from "@/lib/i18n/config";
import { inlineLink } from "@/lib/i18n/links";
import { rich } from "@/lib/i18n/format";
import { pageMetadata } from "@/lib/seo";
import { listProducts } from "@/server/catalog";
import { localizeProducts } from "@/server/localize";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export const generateMetadata = async ({ params }: Props) => pageMetadata("colazione", "/colazione", await langOf(params));

export default async function Colazione({ params }: Props) {
  const lang = await langOf(params);
  const d = getDict(lang);
  const t = d.pages.colazione;
  const crumbs = d.pages.crumbs;
  const products = localizeProducts(await listProducts("colazione"), lang);
  return (
    <>
      <PageHero
        lang={lang}
        title={t.title}
        lead={t.lead}
        crumbs={[
          { name: crumbs.home, path: "/" },
          { name: crumbs.colazione, path: "/colazione" },
        ]}
      >
        <Link href={localePath(lang, "/prenota")} className="btn btn-gold">
          {d.common.bookTable}
        </Link>
        <Link href={localePath(lang, "/pasticceria")} className="btn btn-line">
          {t.ctaPastry}
        </Link>
      </PageHero>

      <section className="section bg-cream text-espresso">
        <div className="wrap">
          <ProductGrid products={products} path="/colazione" lang={lang} />
          <p className="mt-14 max-w-[40rem] text-sm text-espresso/70">{t.note}</p>
        </div>
      </section>

      <section className="section bg-ivory text-espresso">
        <div className="wrap grid gap-10 lg:grid-cols-12">
          <h2 className="t-h2 lg:col-span-6">{t.h2}</h2>
          <div className="max-w-[36rem] space-y-5 lg:col-span-5 lg:col-start-8">
            <p>{t.p1}</p>
            <p>
              {rich(t.p2, {
                cake: inlineLink(lang, "/crea-la-tua-torta"),
                apero: inlineLink(lang, "/aperitivo"),
              })}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
