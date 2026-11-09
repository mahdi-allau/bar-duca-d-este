"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Minus, Plus, RotateCw, Scissors } from "lucide-react";
import DayPicker from "@/components/DayPicker";
import { Field, Honeypot } from "@/components/forms";
import { cn } from "@/lib/cn";
import { DEFAULT_CONFIG, TEXT_COLORS } from "@/lib/cake/defaults";
import { computePrice, euro, hasText, normalizeConfig } from "@/lib/cake/pricing";
import { HEIGHT_RANGE, LAYER_RANGE, describeSize, personsFromDiameter, tierSpecs } from "@/lib/cake/sizing";
import type { CakeConfig, CakeOption, CakePricing } from "@/lib/cake/types";
import { formatDateLong, fromMinutes, toMinutes, weekdayOf } from "@/lib/dates";
import { submitCakeOrder, type OrderState } from "@/app/[lang]/crea-la-tua-torta/actions";
import { useLang } from "@/lib/i18n/client";
import { localePath, type Locale } from "@/lib/i18n/config";
import { fmt, pl, rich } from "@/lib/i18n/format";
import type { Dict } from "@/lib/i18n/it";
import type { SceneApi } from "./CakeScene";

function SceneLoading() {
  const { common } = useLang();
  return <div className="flex h-full w-full items-center justify-center text-espresso/70">{common.loading3d}</div>;
}

const CakeScene = dynamic(() => import("./CakeScene"), {
  ssr: false,
  loading: () => <SceneLoading />,
});

type Hours = { weekday: number; open: string; close: string }[];

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (notify: () => void) => {
  const mq = window.matchMedia(MOTION_QUERY);
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
};
const readMotion = () => window.matchMedia(MOTION_QUERY).matches;

// One animation frame, but never wait more than 120 ms (a hidden tab does not run animation frames).
const frame = () =>
  new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    requestAnimationFrame(finish);
    setTimeout(finish, 120);
  });

const frames = async (n: number) => {
  for (let i = 0; i < n; i++) await frame();
};

function ShapeIcon({ slug }: { slug: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6 } as const;
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden>
      {slug === "round" && <ellipse cx="24" cy="24" rx="15" ry="15" {...common} />}
      {slug === "square" && <rect x="9" y="9" width="30" height="30" rx="4" {...common} />}
      {slug === "rectangle" && <rect x="5" y="14" width="38" height="20" rx="4" {...common} />}
      {slug === "heart" && (
        <path d="M24 40C10 30 7 22 9 16c2-6 10-8 15-2 5-6 13-4 15 2 2 6-1 14-15 24Z" {...common} />
      )}
      {slug === "tiered" && (
        <>
          <rect x="6" y="30" width="36" height="10" rx="3" {...common} />
          <rect x="12" y="19" width="24" height="9" rx="3" {...common} />
          <rect x="18" y="9" width="12" height="8" rx="3" {...common} />
        </>
      )}
    </svg>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-espresso/15 py-8 first:border-t-0 first:pt-0">
      <h2 className="t-h3 mb-5 flex items-baseline gap-3">
        <span className="font-display text-2xl italic text-gold-ink">{n}.</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const chip = (on: boolean) =>
  cn(
    "flex min-h-12 items-center gap-2.5 border px-3.5 py-2 text-start text-sm transition-colors",
    on ? "border-champagne bg-champagne/30 font-semibold" : "border-espresso/25 hover:border-gold",
  );

export default function Configurator({
  lang,
  d,
  options,
  pricing,
  pickupDays,
  hours,
}: {
  lang: Locale;
  d: Pick<Dict, "cake" | "forms" | "common">;
  options: CakeOption[];
  pricing: CakePricing;
  pickupDays: string[];
  hours: Hours;
}) {
  const t = d.cake;
  const money = (c: number) => money(c, lang);
  const of = (kind: CakeOption["kind"]) => options.filter((o) => o.kind === kind).sort((a, b) => a.sort - b.sort);
  const [config, setConfig] = useState<CakeConfig>(() => normalizeConfig(DEFAULT_CONFIG, options, pricing));
  const [cut, setCut] = useState(false);
  const [zoom, setZoom] = useState(1);
  // the cake turns by itself, unless the device asks for less motion or the visitor stopped it
  const reducedMotion = useSyncExternalStore(subscribeMotion, readMotion, () => false);
  const [spinChoice, setSpin] = useState<boolean | null>(null);
  const spin = spinChoice ?? !reducedMotion;
  const [fontFamily, setFontFamily] = useState("Georgia, serif");
  const [fontKey, setFontKey] = useState(0);
  const api = useRef<SceneApi | null>(null);

  const scene = useDeferredValue(config);
  const price = useMemo(
    () =>
      computePrice(config, options, pricing, {
        shape: t.lineShape,
        sponge: t.lineSponge,
        cover: t.lineCover,
        filling: t.lineFilling,
        topping: t.lineTopping,
        text: t.lineText,
      }),
    [config, options, pricing, t],
  );
  const update = useCallback(
    (patch: Partial<CakeConfig>) => setConfig((c) => normalizeConfig({ ...c, ...patch }, options, pricing)),
    [options, pricing],
  );
  // functional updates: two quick clicks in a row must both count
  const toggleTopping = (slug: string) =>
    setConfig((c) =>
      normalizeConfig(
        { ...c, toppings: c.toppings.includes(slug) ? c.toppings.filter((x) => x !== slug) : [...c.toppings, slug] },
        options,
        pricing,
      ),
    );
  const setFilling = (i: number, slug: string) =>
    setConfig((c) => normalizeConfig({ ...c, fillings: c.fillings.map((f, k) => (k === i ? slug : f)) }, options, pricing));
  const setText = (patch: Partial<CakeConfig["text"]>) => update({ text: { ...config.text, ...patch } });

  useEffect(() => {
    const fam = getComputedStyle(document.body).getPropertyValue("--font-cormorant").trim();
    if (!fam) return;
    // the italic faces load lazily: wait for them, then redraw the icing writing
    document.fonts
      .load(`italic 600 40px ${fam}`)
      .then(() => document.fonts.load(`italic 700 40px ${fam}`))
      .then(() => {
        setFontFamily(`${fam}, Georgia, serif`);
        setFontKey((k) => k + 1);
      })
      .catch(() => undefined);
  }, []);

  const spec = tierSpecs(config)[0];
  const shapeName = of("shape").find((s) => s.slug === config.shape)?.name ?? config.shape;
  const label = (kind: CakeOption["kind"], slug: string) => options.find((o) => o.kind === kind && o.slug === slug)?.name ?? slug;

  // diameter slider range, derived from the persons limits at the current height
  const dMin = Math.round(Math.sqrt((pricing.minPersons * 400 * 1) / config.heightCm / Math.PI) * 2);
  const dMax = Math.round(Math.sqrt((pricing.maxPersons * 400 * (config.tiers === 1 ? 1 : 0.62)) / config.heightCm / Math.PI) * 2);

  // --- order form -----------------------------------------------------------
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<OrderState | null>(null);
  const [consent, setConsent] = useState(false);

  const times = useMemo(() => {
    if (!pickupDate) return [];
    const out: string[] = [];
    for (const h of hours.filter((x) => x.weekday === weekdayOf(pickupDate))) {
      for (let t = toMinutes(h.open); t <= toMinutes(h.close); t += 30) out.push(fromMinutes(t));
    }
    return out;
  }, [pickupDate, hours]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSending(true);
    setResult(null);
    const previews: string[] = [];
    const wasCut = cut;
    try {
      // Snapshots of the finished cake travel with the order, so the pastry chef sees exactly what was asked.
      setCut(false);
      await frames(4);
      if (api.current) previews.push(api.current.capture("whole"));
      setCut(true);
      await frames(5);
      if (api.current) previews.push(api.current.capture("cut"));
    } catch (err) {
      console.warn("Anteprima non creata", err); // the order is still valid without images
    } finally {
      setCut(wasCut);
    }
    const res = await submitCakeOrder({
      lang,
      config,
      pickupDate,
      pickupTime,
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      notes: String(form.get("notes") ?? ""),
      previews,
      privacy: consent,
      website: String(form.get("website") ?? ""),
    });
    setResult(res);
    setSending(false);
    if (res.ok) window.scrollTo({ top: document.getElementById("ordina")?.offsetTop ?? 0, behavior: "smooth" });
  }

  const errs = result && !result.ok ? (result.fields ?? {}) : {};

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-12">
      {/* ------------------------------------------------ 3D view */}
      {/* on phones the wrapper disappears so the preview stays pinned while the whole form scrolls under it */}
      <div className="max-lg:contents lg:col-span-7">
        <div className="sticky top-[4.25rem] z-20 max-lg:mb-8 lg:top-24">
          <div className="relative h-[38svh] min-h-[15rem] shadow-[0_10px_24px_-14px_rgba(23,23,21,0.45)] sm:h-[46svh] sm:min-h-[18rem] overflow-hidden border border-espresso/15 bg-[radial-gradient(ellipse_at_50%_35%,#fbf3e3_0%,#efe4cf_60%,#e2d3b6_100%)] lg:h-[calc(100svh-8rem)] lg:max-h-[46rem]">
            <CakeScene
              config={scene}
              options={options}
              cut={cut}
              zoom={zoom}
              autoRotate={spin}
              fontFamily={fontFamily}
              fontKey={fontKey}
              apiRef={api}
              label={t.sceneLabel}
            />
            <div className="absolute end-3 top-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setCut((v) => !v)}
                aria-pressed={cut}
                className={cn(
                  "flex h-11 items-center gap-2 border bg-cream/90 px-3 text-sm backdrop-blur transition-colors max-sm:w-11 max-sm:justify-center max-sm:px-0",
                  cut ? "border-gold bg-champagne" : "border-espresso/30 hover:border-gold",
                )}
              >
                <Scissors className="h-4 w-4" aria-hidden />
                <span className="max-sm:sr-only">{cut ? t.whole : t.cut}</span>
              </button>
              <button
                type="button"
                onClick={() => setSpin(!spin)}
                aria-pressed={spin}
                className="flex h-11 items-center gap-2 border border-espresso/30 bg-cream/90 px-3 text-sm backdrop-blur hover:border-gold max-sm:w-11 max-sm:justify-center max-sm:px-0"
              >
                <RotateCw className="h-4 w-4" aria-hidden />
                <span className="max-sm:sr-only">{spin ? t.stop : t.rotate}</span>
              </button>
              <div className="flex border border-espresso/30 bg-cream/90 backdrop-blur max-sm:w-11 max-sm:flex-col">
                <button
                  type="button"
                  aria-label={t.zoomOut}
                  onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
                  className="flex h-11 items-center justify-center hover:bg-champagne/30 sm:w-1/2 max-sm:w-11"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t.zoomIn}
                  onClick={() => setZoom((z) => Math.min(1.9, +(z + 0.15).toFixed(2)))}
                  className="flex h-11 items-center justify-center border-espresso/20 hover:bg-champagne/30 sm:w-1/2 sm:border-l max-sm:w-11 max-sm:border-t"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-3 start-3 bg-ink/85 px-4 py-2.5 text-ivory">
              <p className="text-[0.65rem] tracking-[0.2em] uppercase text-ivory/70">{t.total}</p>
              <p className="font-display text-3xl leading-none">{money(price.totalCents)}</p>
            </div>
            <p className="pointer-events-none absolute bottom-3 end-3 hidden text-xs text-espresso/72 sm:block">
              {t.drag}
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ steps */}
      <div className="lg:col-span-5">
        {!pricing.pricesConfirmed && (
          <p className="mb-8 border border-gold/60 bg-champagne/20 p-4 text-sm">
            {rich(t.indicative, { b: (c) => <strong>{c}</strong> })}
          </p>
        )}

        <Step n={1} title={t.s1}>
          <div role="radiogroup" aria-label={t.shapeLabel} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {of("shape").map((s) => (
              <button
                key={s.slug}
                type="button"
                role="radio"
                aria-checked={config.shape === s.slug}
                onClick={() => update({ shape: s.slug, tiers: s.slug === "tiered" ? Math.max(2, config.tiers) : 1 })}
                className={cn(chip(config.shape === s.slug), "flex-col !items-center text-center")}
              >
                <ShapeIcon slug={s.slug} />
                <span>{s.name}</span>
                {s.priceCents > 0 && <span className="text-xs text-espresso/70">+{money(s.priceCents)}</span>}
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title={t.s2}>
          <div className="space-y-6">
            <label className="block">
              <span className="mb-2 flex justify-between text-sm font-semibold">
                <span>{t.persons}</span>
                <span>{config.persons}</span>
              </span>
              <input
                type="range"
                min={pricing.minPersons}
                max={pricing.maxPersons}
                value={config.persons}
                onChange={(e) => update({ persons: Number(e.target.value) })}
                className="w-full accent-[#a58a60]"
              />
            </label>
            <label className="block">
              <span className="mb-2 flex justify-between text-sm font-semibold">
                <span>{config.tiers > 1 ? t.sizeBig : t.sizeSmall}</span>
                <span>{describeSize(config.shape === "tiered" ? "round" : config.shape, spec.areaCm2, t.size)}</span>
              </span>
              <input
                type="range"
                min={Math.max(8, dMin)}
                max={Math.max(dMin + 1, dMax)}
                value={Math.min(Math.max(config.diameterCm, dMin), dMax)}
                onChange={(e) =>
                  update({ persons: Math.round(personsFromDiameter(Number(e.target.value), config.heightCm, config.tiers)) })
                }
                className="w-full accent-[#a58a60]"
              />
            </label>
            <label className="block">
              <span className="mb-2 flex justify-between text-sm font-semibold">
                <span>{t.heightEach}</span>
                <span>{config.heightCm} cm</span>
              </span>
              <input
                type="range"
                min={HEIGHT_RANGE.min}
                max={HEIGHT_RANGE.max}
                value={config.heightCm}
                onChange={(e) => update({ heightCm: Number(e.target.value) })}
                className="w-full accent-[#a58a60]"
              />
            </label>
            <div>
              <p className="mb-2 text-sm font-semibold">{t.layers}</p>
              <div className="flex gap-2">
                {Array.from({ length: LAYER_RANGE.max - LAYER_RANGE.min + 1 }, (_, i) => LAYER_RANGE.min + i).map((n) => (
                  <button key={n} type="button" onClick={() => update({ spongeLayers: n })} aria-pressed={config.spongeLayers === n} className={cn(chip(config.spongeLayers === n), "w-14 justify-center")}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {config.shape === "tiered" && (
              <div>
                <p className="mb-2 text-sm font-semibold">{t.tiers}</p>
                <div className="flex gap-2">
                  {[2, 3, 4].map((n) => (
                    <button key={n} type="button" onClick={() => update({ tiers: n })} aria-pressed={config.tiers === n} className={cn(chip(config.tiers === n), "w-14 justify-center")}>
                      {n}
                    </button>
                  ))}
                </div>
                {pricing.extraTierCents > 0 && (
                  <p className="mt-2 text-xs text-espresso/70">{fmt(t.extraTier, { price: money(pricing.extraTierCents) })}</p>
                )}
              </div>
            )}
            <p className="text-sm text-espresso/75">
              {rich(fmt(t.baseFor, { n: config.persons, price: money(price.baseCents) }), { b: (c) => <strong>{c}</strong> })}
            </p>
          </div>
        </Step>

        <Step n={3} title={t.s3}>
          <div className="grid grid-cols-2 gap-2">
            {of("sponge").map((s) => (
              <button key={s.slug} type="button" onClick={() => update({ sponge: s.slug })} aria-pressed={config.sponge === s.slug} className={chip(config.sponge === s.slug)}>
                <span className="h-5 w-5 shrink-0 rounded-full border border-espresso/30" style={{ background: String(s.data.color ?? "#ddd") }} />
                <span>
                  {s.name}
                  {s.priceCents > 0 && <span className="block text-xs text-espresso/70">+{money(s.priceCents)}</span>}
                </span>
              </button>
            ))}
          </div>
        </Step>

        <Step n={4} title={t.s4}>
          <p className="mb-4 text-sm text-espresso/75">
            {pl(lang, t.fillingsIntro, config.spongeLayers - 1, { layers: config.spongeLayers })}
          </p>
          <div className="space-y-5">
            {config.fillings.map((f, i) => (
              <div key={i}>
                <p className="mb-2 text-sm font-semibold">{fmt(t.filling, { n: i + 1 })}</p>
                <div className="grid grid-cols-2 gap-2">
                  {of("filling").map((o) => {
                    const on = f === o.slug;
                    return (
                      <button
                        key={o.slug}
                        type="button"
                        onClick={() => setFilling(i, o.slug)}
                        aria-pressed={on}
                        className={chip(on)}
                      >
                        <span className="h-5 w-5 shrink-0 rounded-full border border-espresso/30" style={{ background: String(o.data.color ?? "#ddd") }} />
                        <span>
                          {o.name}
                          {o.priceCents > 0 && <span className="block text-xs text-espresso/70">+{money(o.priceCents)}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setCut((v) => !v)} className="btn btn-line btn-sm mt-6 !border-ink !text-ink hover:!bg-ink hover:!text-ivory">
            <Scissors className="h-4 w-4" aria-hidden />
            {cut ? t.showWhole : t.showInside}
          </button>
        </Step>

        <Step n={5} title={t.s5}>
          <p className="mb-2 text-sm font-semibold">{t.cover}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {of("cover").map((c) => (
              <button key={c.slug} type="button" onClick={() => update({ cover: c.slug })} aria-pressed={config.cover === c.slug} className={chip(config.cover === c.slug)}>
                <span className="h-5 w-5 shrink-0 rounded-full border border-espresso/30" style={{ background: String(c.data.color ?? "#ddd") }} />
                <span>
                  {c.name}
                  {c.priceCents > 0 && <span className="block text-xs text-espresso/70">+{money(c.priceCents)}</span>}
                </span>
              </button>
            ))}
          </div>
          <p className="mb-2 mt-7 text-sm font-semibold">{t.toppings}</p>
          <div className="grid grid-cols-2 gap-2">
            {of("topping").map((t) => {
              const on = config.toppings.includes(t.slug);
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => toggleTopping(t.slug)}
                  aria-pressed={on}
                  className={chip(on)}
                >
                  <span aria-hidden className={cn("flex h-5 w-5 shrink-0 items-center justify-center border text-xs", on ? "border-gold bg-champagne" : "border-espresso/40")}>
                    {on ? "✓" : ""}
                  </span>
                  <span>
                    {t.name}
                    {t.priceCents > 0 && <span className="block text-xs text-espresso/70">+{money(t.priceCents)}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {config.toppings.includes("personalizzata") && (
            <Field label={t.customLabel} hint={t.customHint} className="mt-5">
              <textarea value={config.custom} maxLength={500} onChange={(e) => update({ custom: e.target.value })} className="field" />
            </Field>
          )}
        </Step>

        <Step n={6} title={t.s6}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.fName} className="sm:col-span-2">
              <input value={config.text.name} maxLength={40} onChange={(e) => setText({ name: e.target.value })} className="field" />
            </Field>
            <Field label={t.fDedication} className="sm:col-span-2">
              <input value={config.text.dedication} maxLength={80} onChange={(e) => setText({ dedication: e.target.value })} className="field" />
            </Field>
            <Field label={t.fMessage} className="sm:col-span-2">
              <input value={config.text.message} maxLength={60} onChange={(e) => setText({ message: e.target.value })} className="field" />
            </Field>
          </div>
          <p className="mb-2 mt-5 text-sm font-semibold">{t.textColor}</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.textColor}>
            {TEXT_COLORS.map((c, ci) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={config.text.color === c.value}
                aria-label={t.textColors[ci] ?? c.name}
                title={t.textColors[ci] ?? c.name}
                onClick={() => setText({ color: c.value })}
                className={cn("h-10 w-10 rounded-full border-2", config.text.color === c.value ? "border-ink ring-2 ring-champagne" : "border-espresso/30")}
                style={{ background: c.value }}
              />
            ))}
          </div>
          {hasText(config) && pricing.textPriceCents > 0 && (
            <p className="mt-3 text-xs text-espresso/70">{fmt(t.textFee, { price: money(pricing.textPriceCents) })}</p>
          )}
        </Step>

        <Step n={7} title={t.s7}>
          <dl className="space-y-1.5 text-sm">
            {[
              [t.sumShape, shapeName],
              [
                t.sumPersons,
                fmt(t.personsLine, {
                  n: config.persons,
                  size: describeSize(config.shape === "tiered" ? "round" : config.shape, spec.areaCm2, t.size),
                  h: config.heightCm,
                  tiers: config.tiers > 1 ? fmt(t.tiersPart, { n: config.tiers }) : "",
                }),
              ],
              [t.sumSponge, fmt(t.spongeLine, { name: label("sponge", config.sponge), n: config.spongeLayers })],
              [t.sumFillings, config.fillings.map((f) => label("filling", f)).join(", ")],
              [t.sumCover, label("cover", config.cover)],
              [t.sumToppings, config.toppings.length ? config.toppings.map((x) => label("topping", x)).join(", ") : t.none],
              [t.sumText, [config.text.message, config.text.name, config.text.age, config.text.dedication].filter(Boolean).join(" · ") || t.none],
              ...(config.custom ? [[t.sumCustom, config.custom]] : []),
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-3">
                <dt className="text-espresso/72">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          <table className="mt-6 w-full text-sm">
            <tbody>
              <tr className="border-b border-espresso/15">
                <td className="py-2">{fmt(t.baseRow, { n: config.persons })}</td>
                <td className="py-2 text-end">{money(price.baseCents)}</td>
              </tr>
              {price.lines
                .filter((l) => l.cents > 0)
                .map((l, i) => (
                  <tr key={i} className="border-b border-espresso/10">
                    <td className="py-2">{l.label}</td>
                    <td className="py-2 text-end">+{money(l.cents)}</td>
                  </tr>
                ))}
              <tr className="border-b border-espresso/15 text-espresso/70">
                <td className="py-2">{t.extras}</td>
                <td className="py-2 text-end">+{money(price.extrasCents)}</td>
              </tr>
              <tr>
                <td className="pt-3 font-display text-2xl">{t.totalRow}</td>
                <td className="pt-3 text-end font-display text-3xl">{money(price.totalCents)}</td>
              </tr>
            </tbody>
          </table>
        </Step>

        <Step n={8} title={t.s8}>
          <div id="ordina" />
          {result?.ok ? (
            <div role="status" className="border border-gold/60 bg-cream p-6">
              <h3 className="t-h3">{t.orderSent}</h3>
              <p className="mt-3">
                {fmt(t.orderSentText, { price: money(result.totalCents) })}
              </p>
              <p dir="ltr" className="mt-4 font-display text-4xl tracking-wide rtl:text-end">
                {result.reference}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`${localePath(lang, "/prenota/stato")}?codice=${result.reference}`} className="btn btn-dark btn-sm">
                  {t.checkStatus}
                </Link>
                <Link href={`${localePath(lang, "/torte-personalizzate")}?ordine=${result.reference}#richiesta`} className="btn btn-line btn-sm !border-ink !text-ink">
                  {t.writeUs}
                </Link>
                <button type="button" onClick={() => { setResult(null); setConsent(false); }} className="btn btn-line btn-sm !border-ink !text-ink">
                  {t.newCake}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="relative space-y-5">
              <Honeypot label={d.common.honeypot} />
              <div>
                <p className="mb-2 text-sm font-semibold">{t.pickupDate}</p>
                {pickupDays.length === 0 ? (
                  <p className="text-sm">{t.noPickup}</p>
                ) : (
                  <DayPicker lang={lang} labels={{ prev: d.booking.prevMonth, next: d.booking.nextMonth, group: d.booking.daysGroup }} openDays={pickupDays} value={pickupDate} onChange={(d) => { setPickupDate(d); setPickupTime(""); }} />
                )}
                {pickupDate && <p className="mt-2 text-sm">{fmt(t.pickupOn, { date: formatDateLong(pickupDate, lang) })}</p>}
                {errs.pickupDate && <p role="alert" className="mt-1 text-sm font-medium text-red-700">{errs.pickupDate}</p>}
              </div>
              {times.length > 0 && (
                <Field label={t.pickupTime}>
                  <select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="field">
                    <option value="">{t.noPref}</option>
                    {times.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label={t.name} error={errs.name}>
                <input name="name" autoComplete="name" required className="field" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t.phone} error={errs.phone}>
                  <input name="phone" type="tel" dir="ltr" autoComplete="tel" required className="field" />
                </Field>
                <Field label={t.email} error={errs.email}>
                  <input name="email" type="email" dir="ltr" autoComplete="email" required className="field" />
                </Field>
              </div>
              <Field label={t.notes} error={errs.notes}>
                <textarea name="notes" maxLength={600} className="field" />
              </Field>
              <div>
                <label className="flex items-start gap-3 text-sm leading-snug">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#a58a60]" required />
                  <span>
                    {rich(d.forms.consentOrder, {
                      privacy: (c) => (
                        <a href={localePath(lang, "/privacy")} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                          {c}
                        </a>
                      ),
                    })}
                  </span>
                </label>
                {errs.privacy && <p role="alert" className="mt-1 text-sm font-medium text-red-700">{errs.privacy}</p>}
              </div>
              {result && !result.ok && !result.fields && <p role="alert" className="font-medium text-red-700">{result.error}</p>}
              <button type="submit" disabled={sending || !pickupDate} className="btn btn-dark w-full disabled:opacity-50">
                {sending ? t.sendingOrder : fmt(t.submit, { price: money(price.totalCents) })}
              </button>
              {!pickupDate && <p className="text-sm text-espresso/70">{t.pickFirst}</p>}
              <p className="text-xs text-espresso/72">
                {t.disclaimer}
              </p>
            </form>
          )}
        </Step>
      </div>
    </div>
  );
}
