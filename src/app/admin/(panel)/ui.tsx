import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({ title, lead, children }: { title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-light sm:text-5xl">{title}</h1>
        {children}
      </div>
      {lead && <p className="mt-3 max-w-2xl text-[0.97rem] leading-relaxed text-espresso/80">{lead}</p>}
    </header>
  );
}

/** A labelled form field with an optional explanation underneath. */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-snug text-espresso/72">{hint}</span>}
    </label>
  );
}

/** A coloured notice at the top of a page: what is wrong, or that all is well. */
export function Notice({ tone = "info", children }: { tone?: "ok" | "warn" | "info"; children: ReactNode }) {
  const tones = {
    ok: "border-emerald-700/40 bg-emerald-50 text-emerald-950",
    warn: "border-amber-600/50 bg-amber-50 text-amber-950",
    info: "border-espresso/20 bg-cream text-espresso",
  };
  return <div className={cn("mb-8 border px-4 py-3 text-[0.95rem] leading-snug", tones[tone])}>{children}</div>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border border-espresso/15 bg-cream p-5 sm:p-6", className)}>{children}</div>;
}

const TONES: Record<string, string> = {
  new: "bg-amber-100 text-amber-900",
  pending: "bg-amber-100 text-amber-900",
  confirmed: "bg-emerald-100 text-emerald-900",
  ready: "bg-emerald-100 text-emerald-900",
  completed: "bg-stone-200 text-stone-800",
  done: "bg-stone-200 text-stone-800",
  cancelled: "bg-red-100 text-red-900",
  rejected: "bg-red-100 text-red-900",
  no_show: "bg-red-100 text-red-900",
  in_progress: "bg-sky-100 text-sky-900",
  quoted: "bg-sky-100 text-sky-900",
  sent: "bg-emerald-100 text-emerald-900",
  failed: "bg-red-100 text-red-900",
  skipped: "bg-amber-100 text-amber-900",
};

export const LABELS: Record<string, string> = {
  new: "Nuova",
  pending: "In attesa",
  confirmed: "Confermata",
  ready: "Pronta",
  completed: "Completata",
  done: "Chiusa",
  cancelled: "Annullata",
  rejected: "Rifiutata",
  no_show: "Non presentato",
  in_progress: "In lavorazione",
  quoted: "Preventivo inviato",
  sent: "Inviata",
  failed: "Non inviata",
  skipped: "Non inviata (prova)",
};

export function Status({ value }: { value: string }) {
  return (
    <span className={cn("inline-block px-2.5 py-0.5 text-xs font-semibold", TONES[value] ?? "bg-stone-200")}>
      {LABELS[value] ?? value}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-espresso/25 p-8 text-center text-espresso/70">{children}</p>;
}

export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
};

export const fmtDateTime = (d: Date | string) =>
  new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" }).format(
    new Date(d),
  );
