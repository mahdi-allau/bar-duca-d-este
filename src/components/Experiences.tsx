import Image from "next/image";
import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/i18n/config";
import { IMG, type Photo } from "@/lib/images";
import { cn } from "@/lib/cn";
import { FadeIn, Lines } from "./motion-kit";

type Card = {
  id: string;
  n: string;
  imgKey: string;
  photo: Photo;
  position: string;
  offset: string;
  href: string;
};

const CARDS: Card[] = [
  { id: "colazione", href: "/colazione", n: "01", imgKey: "colazione", photo: IMG.colazione, position: "50% 50%", offset: "" },
  { id: "pasticceria", href: "/pasticceria", n: "02", imgKey: "vetrinaDolci", photo: IMG.vetrinaDolci, position: "55% 30%", offset: "xl:mt-24" },
  { id: "caffetteria", href: "/colazione", n: "03", imgKey: "caffe", photo: IMG.caffe, position: "50% 50%", offset: "" },
  { id: "aperitivo", href: "/aperitivo", n: "04", imgKey: "aperitivo", photo: IMG.aperitivo, position: "58% 50%", offset: "xl:mt-24" },
];

export default function Experiences({ lang }: { lang: Locale }) {
  const d = getDict(lang);
  const t = d.home;
  return (
    <section id="esperienze" className="section bg-ink text-ivory">
      <div className="wrap">
        <div className="grid grid-cols-12 items-end gap-x-0 gap-y-8 sm:gap-x-8">
          <h2 className="t-h2 col-span-12 lg:col-span-8">
            <Lines lines={t.expLines} />
          </h2>
          <FadeIn className="col-span-12 lg:col-span-4 lg:col-start-9" delay={0.15}>
            <p className="max-w-[26rem] text-ivory/75">{t.expIntro}</p>
          </FadeIn>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:mt-24 xl:grid-cols-4">
          {CARDS.map((c, i) => (
            <FadeIn key={c.id} delay={(i % 2) * 0.12} y={26} className={cn(c.offset)}>
              <article id={c.id} className="group relative isolate aspect-[3/4.2] overflow-hidden bg-espresso">
                <Image
                  src={c.photo.src}
                  alt={d.img[c.imgKey] ?? c.photo.alt}
                  fill
                  sizes="(min-width: 1280px) 24vw, (min-width: 640px) 46vw, 92vw"
                  className="-z-10 object-cover transition-transform duration-[1600ms] ease-lux group-hover:scale-[1.07]"
                  style={{ objectPosition: c.position }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-ink/25 to-ink/10 transition-opacity duration-700 group-hover:from-ink/95"
                />

                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-6 sm:p-7">
                  <span className="font-display text-2xl italic text-champagne">{c.n}</span>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                  <h3 className="t-h3">
                    <Link href={localePath(lang, c.href)} className="after:absolute after:inset-0 after:content-['']">
                      {t.cards[c.id].title}
                    </Link>
                  </h3>
                  <span
                    aria-hidden
                    className="mt-4 block h-px w-10 bg-champagne transition-[width] duration-[900ms] ease-lux group-hover:w-full"
                  />
                  {/* On hover-capable devices the line of text unfolds; touch devices always see it */}
                  <div className="grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-[800ms] ease-lux [@media(hover:hover)]:grid-rows-[0fr] [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:grid-rows-[1fr] [@media(hover:hover)]:group-hover:opacity-100">
                    <p className="overflow-hidden pt-4 text-[0.95rem] leading-relaxed text-ivory/85">{t.cards[c.id].text}</p>
                  </div>
                </div>
              </article>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
