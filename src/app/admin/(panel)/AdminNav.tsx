"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type NavBadges = { reservations: number; cakes: number; requests: number };

const GROUPS = [
  {
    title: "Ogni giorno",
    links: [
      { href: "/admin", label: "Panoramica", hint: "Cosa fare oggi" },
      { href: "/admin/prenotazioni", label: "Prenotazioni tavoli", badge: "reservations" as const },
      { href: "/admin/torte", label: "Ordini torte", badge: "cakes" as const },
      { href: "/admin/richieste", label: "Richieste ed eventi", badge: "requests" as const },
    ],
  },
  {
    title: "Il locale",
    links: [
      { href: "/admin/orari", label: "Orari, posti e chiusure" },
      { href: "/admin/avvisi", label: "Avvisi sul telefono" },
      { href: "/admin/email", label: "Email" },
    ],
  },
  {
    title: "Torte su misura",
    links: [
      { href: "/admin/prezzi", label: "Prezzi e ritiri" },
      { href: "/admin/ingredienti", label: "Ingredienti" },
    ],
  },
  {
    title: "Il sito",
    links: [
      { href: "/admin/catalogo", label: "Prodotti" },
      { href: "/admin/foto", label: "Fotografie" },
      { href: "/admin/seo", label: "Titoli per Google" },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.links);

function useActive() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const current = ALL.find((l) => isActive(l.href))?.label ?? "Amministrazione";
  return { pathname, isActive, current };
}

function Links({ badges, onNavigate }: { badges: NavBadges; onNavigate?: () => void }) {
  const { isActive } = useActive();
  return (
    <nav aria-label="Amministrazione" className="space-y-6">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="px-3 pb-1.5 text-[0.68rem] font-semibold tracking-[0.18em] text-ivory/45 uppercase">{g.title}</p>
          <ul>
            {g.links.map((l) => {
              const n = "badge" in l && l.badge ? badges[l.badge] : 0;
              const active = isActive(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-3 border-l-2 px-3 py-2 text-[0.95rem] transition-colors",
                      active
                        ? "border-champagne bg-ivory/10 font-semibold text-ivory"
                        : "border-transparent text-ivory/80 hover:bg-ivory/5 hover:text-ivory",
                    )}
                  >
                    <span>{l.label}</span>
                    {n > 0 && (
                      <span
                        className="min-w-6 bg-champagne px-1.5 text-center text-xs font-bold leading-6 text-ink"
                        aria-label={`${n} da vedere`}
                      >
                        {n}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <Image src="/logo-seal-480.webp" alt="" width={44} height={44} className="h-11 w-11 rounded-full" />
      <div className="leading-tight">
        <p className="font-display text-xl">Duca d&rsquo;Este</p>
        <p className="text-xs text-ivory/60">Amministrazione</p>
      </div>
    </div>
  );
}

/** Desktop: a fixed side menu. Phone: a top bar with the page name and a menu that opens full width. */
export default function AdminNav({
  badges,
  email,
  logout,
}: {
  badges: NavBadges;
  email: string;
  logout: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { current } = useActive();
  const total = badges.reservations + badges.cakes + badges.requests;

  // the number on the app icon, kept in step with what is waiting for an answer
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (total > 0) nav.setAppBadge?.(total)?.catch(() => {});
    else nav.clearAppBadge?.()?.catch(() => {});
  }, [total]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const footer = (
    <div className="space-y-3 border-t border-ivory/15 pt-5 text-sm text-ivory/75">
      <p className="break-all">{email}</p>
      <Link href="/" target="_blank" className="block py-1 underline underline-offset-4 hover:text-ivory">
        Apri il sito
      </Link>
      {logout}
    </div>
  );

  return (
    <>
      {/* phone */}
      <div className="sticky top-0 z-40 bg-ink text-ivory lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="admin-menu"
            className="flex h-11 items-center gap-2 pr-3 text-[0.95rem] font-semibold"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            <span>{open ? "Chiudi" : "Menu"}</span>
            {!open && total > 0 && (
              <span className="min-w-6 bg-champagne px-1.5 text-center text-xs font-bold leading-6 text-ink">{total}</span>
            )}
          </button>
          <p className="truncate font-display text-xl">{current}</p>
        </div>
        {open && (
          <div id="admin-menu" className="fixed inset-x-0 bottom-0 top-14 overflow-y-auto bg-ink px-3 pb-10 pt-4">
            <div className="mb-6 px-3">
              <Brand />
            </div>
            <Links badges={badges} onNavigate={() => setOpen(false)} />
            <div className="mt-8 px-3">{footer}</div>
          </div>
        )}
      </div>

      {/* desktop */}
      <aside className="hidden bg-ink text-ivory lg:block">
        <div className="sticky top-0 flex max-h-screen min-h-screen flex-col overflow-y-auto px-3 py-6">
          <div className="mb-8 px-3">
            <Brand />
          </div>
          <Links badges={badges} />
          <div className="mt-auto px-3 pt-8">{footer}</div>
        </div>
      </aside>
    </>
  );
}
