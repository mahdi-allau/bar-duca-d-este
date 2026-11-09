/**
 * Single source of truth for every business fact shown on the site.
 * Only details supplied by the client are listed here: no opening hours,
 * prices, menu items or founding dates have been invented.
 */
const street = "Piazzetta del Castello 22";
const postalCode = "44121";
const city = "Ferrara";
const addressLine = `${street}, ${postalCode} ${city}, Italia`;

export const SITE = {
  name: "Bar Pasticceria Duca d'Este",
  shortName: "Duca d'Este",
  // Set NEXT_PUBLIC_SITE_URL in production (e.g. https://www.il-tuo-dominio.it)
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  street,
  postalCode,
  city,
  region: "Emilia-Romagna",
  country: "IT",
  addressLine,
  phone: "+39 0532 207688",
  phoneHref: "tel:+390532207688",
  email: "paoloducadeste@icloud.com",
  emailHref: "mailto:paoloducadeste@icloud.com",
  tripadvisor:
    "https://www.tripadvisor.it/Restaurant_Review-g194760-d10325805-Reviews-Bar_Pasticceria_Duca_D_Este-Ferrara_Province_of_Ferrara_Emilia_Romagna.html",
  mapsEmbed: `https://www.google.com/maps?q=${encodeURIComponent(
    `${street}, ${postalCode} ${city}`,
  )}&hl=it&z=17&output=embed`,
  mapsDirections: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${street}, ${postalCode} ${city}`,
  )}`,
  mapsPlace: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${street}, ${postalCode} ${city}`,
  )}`,
} as const;

/** The labels come from the dictionary (common.nav), in the visitor's language. */
export const NAV = [
  { href: "/", key: "home" },
  { href: "/colazione", key: "colazione" },
  { href: "/pasticceria", key: "pasticceria" },
  { href: "/aperitivo", key: "aperitivo" },
  { href: "/crea-la-tua-torta", key: "torta" },
  { href: "/#contatti", key: "contatti" },
] as const;
