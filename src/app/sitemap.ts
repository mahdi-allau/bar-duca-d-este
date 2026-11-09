import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

const PAGES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/colazione", priority: 0.8, changeFrequency: "weekly" },
  { path: "/pasticceria", priority: 0.8, changeFrequency: "weekly" },
  { path: "/aperitivo", priority: 0.8, changeFrequency: "weekly" },
  { path: "/crea-la-tua-torta", priority: 0.9, changeFrequency: "monthly" },
  { path: "/torte-personalizzate", priority: 0.8, changeFrequency: "monthly" },
  { path: "/prenota", priority: 0.9, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({
    url: `${SITE.url}${p.path === "/" ? "/" : p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
