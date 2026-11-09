import { MapPin } from "lucide-react";
import { getDict } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { IMG } from "@/lib/images";
import { SITE } from "@/lib/site";
import { FadeIn, Lines, Photo } from "./motion-kit";

export default function Location({ lang }: { lang: Locale }) {
  const d = getDict(lang);
  const t = d.home;
  return (
    <section id="location" className="section bg-espresso text-ivory">
      <div className="wrap">
        <div className="grid grid-cols-12 items-center gap-x-0 gap-y-14 sm:gap-x-8 lg:gap-x-12">
          {/* The real shop window: the square is reflected in the glass */}
          <div className="col-span-12 sm:col-span-9 lg:col-span-5">
            <Photo
              src={IMG.vetrinaInsegna.src}
              alt={d.img.vetrinaInsegna}
              sizes="(min-width: 1024px) 40vw, (min-width: 640px) 70vw, 92vw"
              className="aspect-[1096/1435] w-full"
              position="50% 0%"
              parallax={2}
            />
          </div>

          <div className="col-span-12 lg:col-span-7">
            <h2 className="t-h2">
              <Lines lines={t.locLines} />
            </h2>

            <FadeIn delay={0.1} className="mt-10">
              <p className="t-lead max-w-[32rem] text-ivory/90">{t.locLead}</p>
            </FadeIn>

            <FadeIn delay={0.15} className="mt-10">
              <address className="flex gap-4 not-italic">
                <MapPin aria-hidden className="mt-1.5 h-5 w-5 shrink-0 text-champagne" strokeWidth={1.4} />
                <span className="font-display text-[1.7rem] font-light leading-snug">
                  {SITE.street}
                  <br />
                  {SITE.postalCode} {SITE.city}, {d.common.country}
                </span>
              </address>
            </FadeIn>

            <FadeIn delay={0.2} className="mt-10 flex flex-col gap-3.5 sm:flex-row">
              <a href={SITE.mapsDirections} target="_blank" rel="noopener noreferrer" className="btn btn-gold">
                {t.reach}
              </a>
              <a href={SITE.mapsPlace} target="_blank" rel="noopener noreferrer" className="btn btn-line">
                {t.openMaps}
              </a>
            </FadeIn>
          </div>
        </div>

        <FadeIn className="mt-20 lg:mt-28" delay={0.1}>
          <div className="map-frame relative border border-champagne/30 p-2 sm:p-3">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink sm:aspect-[16/9] lg:aspect-[21/9]">
              <iframe
                title={t.mapTitle}
                src={SITE.mapsEmbed.replace("hl=it", `hl=${lang}`)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
