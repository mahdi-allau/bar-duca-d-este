import PageHero from "@/components/PageHero";
import Configurator from "@/components/cake/Configurator";
import { pageMetadata } from "@/lib/seo";
import { getPickupDays } from "@/server/cake-orders";
import { getCakeCatalog, getOpeningHours } from "@/server/settings";

export const dynamic = "force-dynamic";

export const generateMetadata = () =>
  pageMetadata("crea-la-tua-torta", "/crea-la-tua-torta", {
    title: "Crea la tua torta in 3D: configuratore online | Duca d'Este Ferrara",
    description:
      "Progetta la tua torta in 3D: scegli forma, dimensioni, pan di Spagna, farciture e decorazioni, vedi il prezzo aggiornarsi e invia l'ordine alla pasticceria Duca d'Este di Ferrara.",
  });

export default async function CreaLaTuaTorta() {
  const { options, pricing } = await getCakeCatalog();
  const [pickupDays, hours] = await Promise.all([getPickupDays(pricing), getOpeningHours()]);

  return (
    <>
      <PageHero
        title="Crea la tua torta"
        lead="Scegli ogni ingrediente e guarda la torta prendere forma in 3D: puoi ruotarla, ingrandirla e tagliarla per vedere gli strati. Il prezzo si aggiorna a ogni scelta."
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Crea la tua torta", path: "/crea-la-tua-torta" },
        ]}
      />
      <section className="bg-ivory pb-24 pt-10 text-espresso lg:pt-16">
        <div className="wrap">
          <Configurator
            options={options}
            pricing={pricing}
            pickupDays={pickupDays}
            hours={hours.map((h) => ({ weekday: h.weekday, open: h.open, close: h.close }))}
          />
        </div>
      </section>
    </>
  );
}
