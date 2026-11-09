import PageHero from "@/components/PageHero";
import { getDict, langOf } from "@/lib/i18n";
import { rich } from "@/lib/i18n/format";
import { inlineLink } from "@/lib/i18n/links";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { bookingClosedReason, getOpenDays, loadConfig } from "@/server/booking";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ motivo?: string }> };

export const generateMetadata = async ({ params }: Pick<Props, "params">) => pageMetadata("prenota", "/prenota", await langOf(params));

export default async function Prenota({ params, searchParams }: Props) {
  const lang = await langOf(params);
  const d = getDict(lang);
  const t = d.pages.prenota;
  const { motivo } = await searchParams;
  const cfg = await loadConfig();
  const closedReason = bookingClosedReason(cfg, lang);
  const openDays = closedReason ? [] : await getOpenDays();
  const defaultNotes = motivo === "aperitivo" ? d.pages.aperitivo.defaultNote : "";

  return (
    <>
      <PageHero
        lang={lang}
        title={t.title}
        lead={t.lead}
        crumbs={[
          { name: d.pages.crumbs.home, path: "/" },
          { name: d.pages.crumbs.prenota, path: "/prenota" },
        ]}
      />
      <section className="section bg-ivory text-espresso">
        <div className="wrap">
          {closedReason ? (
            <div className="max-w-xl border border-gold/50 bg-cream p-8">
              <h2 className="t-h3">{closedReason}</h2>
              <p className="mt-4">
                {rich(t.closedCall, {
                  phone: (
                    <a href={SITE.phoneHref} dir="ltr" className="underline underline-offset-4">
                      {SITE.phone}
                    </a>
                  ),
                  email: (
                    <a href={SITE.emailHref} dir="ltr" className="underline underline-offset-4">
                      {SITE.email}
                    </a>
                  ),
                })}
              </p>
            </div>
          ) : (
            <BookingForm
              lang={lang}
              d={{ booking: d.booking, forms: d.forms, common: d.common }}
              openDays={openDays}
              maxParty={cfg.booking.maxPartySize}
              defaultNotes={defaultNotes}
            />
          )}
          <p className="mt-14 text-sm text-espresso/70">
            {rich(t.after, {
              status: inlineLink(lang, "/prenota/stato"),
              cake: inlineLink(lang, "/crea-la-tua-torta"),
            })}
          </p>
        </div>
      </section>
    </>
  );
}
