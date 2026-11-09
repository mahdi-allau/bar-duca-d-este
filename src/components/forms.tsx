import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { rich } from "@/lib/i18n/format";
import { localePath, type Locale } from "@/lib/i18n/config";

export function Field({
  label,
  error,
  hint,
  children,
  className,
  tone = "light",
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <label className={cn("block", className)}>
      <span className={cn("mb-1.5 block text-sm font-semibold", tone === "dark" && "text-ivory")}>{label}</span>
      {children}
      {hint && !error && (
        <span className={cn("mt-1 block text-xs", tone === "dark" ? "text-ivory/60" : "text-espresso/72")}>{hint}</span>
      )}
      {error && (
        <span role="alert" className={cn("mt-1 block text-sm font-medium", tone === "dark" ? "text-red-300" : "text-red-700")}>
          {error}
        </span>
      )}
    </label>
  );
}

/** Invisible trap for bots: people never see or fill it. */
export function Honeypot({ label = "Website" }: { label?: string }) {
  return (
    <div aria-hidden className="absolute start-[-9999px] h-0 w-0 overflow-hidden">
      <label>
        {label}
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

export function PrivacyConsent({
  text,
  lang,
  error,
  tone = "light",
}: {
  text: string;
  lang: Locale;
  error?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div>
      <label className="flex items-start gap-3 text-sm leading-snug">
        <input
          type="checkbox"
          name="privacy"
          required
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#a58a60]"
        />
        <span>
          {rich(text, {
            privacy: (c) => (
              <a href={localePath(lang, "/privacy")} target="_blank" rel="noopener noreferrer" className={cn("underline underline-offset-4", tone === "dark" && "text-champagne")}>
                {c}
              </a>
            ),
          })}
        </span>
      </label>
      {error && (
        <p role="alert" className={cn("mt-1 text-sm font-medium", tone === "dark" ? "text-red-300" : "text-red-700")}>
          {error}
        </p>
      )}
    </div>
  );
}
