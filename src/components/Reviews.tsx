import { ExternalLink } from "lucide-react";
import { getDict } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { SITE } from "@/lib/site";
import { FadeIn, Lines } from "./motion-kit";
import { DoubleFrame, Ornament } from "./ornaments";

/**
 * No testimonials, ratings or star counts are shown: none have been supplied,
 * and inventing them would be misleading. The section simply sends visitors
 * to the venue's own Tripadvisor page.
 */
export default function Reviews({ lang }: { lang: Locale }) {
  const t = getDict(lang).home;
  return (
    <section id="recensioni" className="section bg-cream text-espresso">
      <div className="wrap">
        <DoubleFrame>
          <div className="grid grid-cols-12 items-center gap-x-0 gap-y-10 sm:gap-x-8 px-6 py-14 sm:px-10 md:py-20 lg:px-16 lg:py-24">
            <div className="col-span-12 lg:col-span-7">
              <h2 className="t-h2">
                <Lines lines={t.revLines} />
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-5">
              <FadeIn delay={0.1}>
                <Ornament className="mb-7" />
                <p className="max-w-[26rem]">{t.revText}</p>
                <a
                  href={SITE.tripadvisor}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-dark mt-9 w-full sm:w-auto"
                >
                  {t.revCta}
                  <ExternalLink aria-hidden className="h-4 w-4" strokeWidth={1.6} />
                  <span className="sr-only">{t.revSr}</span>
                </a>
              </FadeIn>
            </div>
          </div>
        </DoubleFrame>
      </div>
    </section>
  );
}
