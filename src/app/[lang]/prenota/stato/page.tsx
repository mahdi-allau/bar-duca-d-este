import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { getDict, langOf } from "@/lib/i18n";
import { alternatesFor, localePath } from "@/lib/i18n/config";
import StatusLookup from "./StatusLookup";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ codice?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const lang = await langOf(params);
  return {
    title: getDict(lang).seo.statusTitle,
    robots: { index: false },
    alternates: { canonical: localePath(lang, "/prenota/stato"), languages: alternatesFor("/prenota/stato") },
  };
}

export default async function Stato({ params, searchParams }: Props) {
  const lang = await langOf(params);
  const d = getDict(lang);
  const { codice } = await searchParams;
  return (
    <>
      <PageHero
        lang={lang}
        title={d.pages.stato.title}
        lead={d.pages.stato.lead}
        crumbs={[
          { name: d.pages.crumbs.home, path: "/" },
          { name: d.pages.crumbs.prenota, path: "/prenota" },
          { name: d.pages.crumbs.stato, path: "/prenota/stato" },
        ]}
      />
      <section className="section bg-ivory text-espresso">
        <div className="wrap">
          <StatusLookup lang={lang} t={d.status} cake={d.cake} forms={d.forms} defaultCode={(codice ?? "").slice(0, 20)} />
        </div>
      </section>
    </>
  );
}
