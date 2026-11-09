import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import { getDict } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/i18n/config";
import { NAV, SITE } from "@/lib/site";
import { FadeIn, Lines } from "./motion-kit";

/** Contact block and footer in one dark closing section. */
export default function Contact({ lang }: { lang: Locale }) {
  const d = getDict(lang);
  const c = d.common;
  const t = d.home;
  return (
    <footer id="contatti" className="bg-ink text-ivory">
      <div className="wrap section grid grid-cols-12 gap-x-0 gap-y-16 sm:gap-x-8 !pb-20">
        <div className="col-span-12 lg:col-span-7">
          <h2 className="t-h2">
            <Lines lines={t.contactLines} />
          </h2>
          <FadeIn delay={0.1} className="mt-10 flex flex-col gap-3.5 sm:flex-row sm:flex-wrap">
            <a href={SITE.phoneHref} className="btn btn-gold">
              <Phone aria-hidden className="h-4 w-4" strokeWidth={1.6} />
              {t.call}
            </a>
            <a href={SITE.emailHref} className="btn btn-line">
              <Mail aria-hidden className="h-4 w-4" strokeWidth={1.6} />
              {t.write}
            </a>
            <a href={SITE.mapsDirections} target="_blank" rel="noopener noreferrer" className="btn btn-line">
              <MapPin aria-hidden className="h-4 w-4" strokeWidth={1.6} />
              {t.directions}
            </a>
          </FadeIn>
        </div>

        <FadeIn className="col-span-12 lg:col-span-5" delay={0.15}>
          <Image
            src="/logo-seal-480.webp"
            alt={c.sealAlt}
            width={176}
            height={176}
            sizes="176px"
            className="h-32 w-32 rounded-full sm:h-44 sm:w-44"
          />
          <p className="mt-8 font-display text-[1.9rem] font-light leading-tight text-champagne">{SITE.name}</p>
          <address className="mt-5 space-y-1 not-italic text-ivory/85">
            <p>
              {SITE.street}
              <br />
              {SITE.postalCode} {SITE.city}, {c.country}
            </p>
            <p className="pt-3">
              {c.phoneLabel}:{" "}
              <a href={SITE.phoneHref} dir="ltr" className="link-u inline-block py-2 text-ivory">
                {SITE.phone}
              </a>
            </p>
            <p>
              {c.emailLabel}:{" "}
              <a href={SITE.emailHref} dir="ltr" className="link-u inline-block break-all py-2 text-ivory">
                {SITE.email}
              </a>
            </p>
          </address>

          <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <li>
              <a href={SITE.mapsPlace} target="_blank" rel="noopener noreferrer" className="link-u inline-block py-2 text-champagne">
                Google Maps
              </a>
            </li>
            <li>
              <a href={SITE.tripadvisor} target="_blank" rel="noopener noreferrer" className="link-u inline-block py-2 text-champagne">
                Tripadvisor
              </a>
            </li>
          </ul>
        </FadeIn>
      </div>

      <div className="border-t border-champagne/20">
        <div className="wrap flex flex-col gap-6 py-8 text-sm text-ivory/60 md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {SITE.name} &middot; {SITE.street}, {SITE.city}
          </p>
          <nav aria-label={c.footerNav}>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {NAV.slice(1).map((item) => (
                <li key={item.href}>
                  <a href={localePath(lang, item.href)} className="link-u inline-block py-2 transition-colors hover:text-ivory">
                    {c.nav[item.key]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
