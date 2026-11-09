import Link from "next/link";
import PageHero from "@/components/PageHero";
import { getDict, langOf } from "@/lib/i18n";
import { localePath } from "@/lib/i18n/config";
import { rich } from "@/lib/i18n/format";
import { inlineLink } from "@/lib/i18n/links";
import { pageMetadata } from "@/lib/seo";
import RequestForm from "./RequestForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ ordine?: string }> };

export const generateMetadata = async ({ params }: Pick<Props, "params">) =>
  pageMetadata("torte-personalizzate", "/torte-personalizzate", await langOf(params));

export default async function TortePersonalizzate({ params, searchParams }: Props) {
  const lang = await langOf(params);
  const d = getDict(lang);
  const t = d.pages.torte;
  const { ordine } = await searchParams;
  const cakeReference = /^TO-[A-Z0-9]{4,12}$/i.test(ordine ?? "") ? (ordine as string).toUpperCase() : "";
  return (
    <>
      <PageHero
        lang={lang}
        title={t.title}
        lead={t.lead}
        crumbs={[
          { name: d.pages.crumbs.home, path: "/" },
          { name: d.pages.crumbs.torte, path: "/torte-personalizzate" },
        ]}
      >
        <Link href={localePath(lang, "/crea-la-tua-torta")} className="btn btn-gold">
          {d.home.ctaCake}
        </Link>
        <a href="#richiesta" className="btn btn-line">
          {t.ctaRequest}
        </a>
      </PageHero>

      <section id="eventi" className="section bg-cream text-espresso">
        <div className="wrap">
          <h2 className="t-h2 max-w-[18ch]">{t.h2}</h2>
          <ul className="mt-14 grid gap-px border border-espresso/15 bg-espresso/15 sm:grid-cols-2 lg:grid-cols-3">
            {t.occasions.map((o) => (
              <li key={o.id} id={o.id} className="bg-cream p-7 sm:p-9">
                <h3 className="t-h3">{o.title}</h3>
                <p className="mt-3 max-w-[30ch] text-espresso/80">{o.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-10 max-w-[40rem]">
            {rich(t.p, { cake: inlineLink(lang, "/crea-la-tua-torta"), pastry: inlineLink(lang, "/pasticceria") })}
          </p>
        </div>
      </section>

      <section id="richiesta" className="section bg-espresso text-ivory">
        <div className="wrap grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="t-h2">{t.h2b}</h2>
            <p className="mt-6 max-w-[30rem] text-ivory/80">{t.leadb}</p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <RequestForm
              lang={lang}
              d={{ request: d.request, forms: d.forms, common: d.common }}
              cakeReference={cakeReference}
              defaultKind={cakeReference ? "personalizzata" : ""}
            />
          </div>
        </div>
      </section>
    </>
  );
}
