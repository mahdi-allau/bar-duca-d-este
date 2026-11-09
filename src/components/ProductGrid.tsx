import Image from "next/image";
import { euro } from "@/lib/cake/pricing";
import { getDict } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/i18n/config";
import { SITE } from "@/lib/site";
import type { Product } from "@/server/catalog";
import { JsonLd } from "./PageHero";

/** Product cards. A card shows a price only when the owner has set one in the admin panel. */
export default function ProductGrid({ products, path, lang }: { products: Product[]; path: string; lang: Locale }) {
  if (products.length === 0) return null;
  const d = getDict(lang);

  const jsonLd = products.map((p) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    ...(p.image ? { image: `${SITE.url}${p.image}` } : {}),
    brand: { "@type": "Brand", name: SITE.name },
    url: `${SITE.url}${localePath(lang, path)}#${p.slug}`,
    ...(p.priceCents != null
      ? {
          offers: {
            "@type": "Offer",
            price: (p.priceCents / 100).toFixed(2),
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            url: `${SITE.url}${localePath(lang, path)}`,
          },
        }
      : {}),
  }));

  return (
    <>
      <JsonLd data={jsonLd} />
      <h2 className="sr-only">{d.pages.products.heading}</h2>
      <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <li key={p.id} id={p.slug}>
            <article>
              <div className="relative aspect-[4/3] overflow-hidden bg-espresso/10">
                {p.image ? (
                  <Image
                    src={p.image}
                    alt={`${p.name}`}
                    fill
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                    className="object-cover transition-transform duration-[1400ms] ease-lux hover:scale-[1.04]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-display text-2xl italic text-espresso/70">
                    {d.common.photoSoon}
                  </div>
                )}
              </div>
              <div className="mt-5 flex items-baseline justify-between gap-4">
                <h3 className="t-h3">{p.name}</h3>
                {p.priceCents != null && <p className="shrink-0 font-display text-2xl">{euro(p.priceCents, lang)}</p>}
              </div>
              <p className="mt-2 max-w-[34ch] text-espresso/80">{p.description}</p>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
