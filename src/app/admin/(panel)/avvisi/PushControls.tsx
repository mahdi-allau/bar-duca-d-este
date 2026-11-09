"use client";

import { BellRing, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { notify } from "../AdminForm";
import { Card } from "../ui";
import { removePushSubscription, savePushSubscription, sendTestPush } from "./actions";

export type Device = { endpoint: string; label: string; createdAt: string; lastOkAt: string | null; lastError: string };

type State = "loading" | "install" | "unsupported" | "denied" | "off" | "on";

const SW_URL = "/admin-app/sw.js";
const SW_SCOPE = "/admin-app/";

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Computer Windows";
  if (/Mac/.test(ua)) return "Mac";
  return "Telefono";
}

function keyBytes(base64Url: string) {
  const b64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** pushManager.subscribe needs an *active* worker, and `ready` never fires for a page outside the worker's scope. */
async function activeRegistration() {
  const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
  const worker = reg.installing ?? reg.waiting;
  if (!reg.active && worker) {
    await new Promise<void>((resolve) => {
      worker.addEventListener("statechange", () => worker.state === "activated" && resolve());
      if (worker.state === "activated") resolve();
    });
  }
  return reg;
}

async function detect(): Promise<{ state: State; endpoint?: string }> {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return { state: isIos() && !isStandalone() ? "install" : "unsupported" };
  if (Notification.permission === "denied") return { state: "denied" };
  const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  const sub = await reg?.pushManager.getSubscription();
  return sub ? { state: "on", endpoint: sub.endpoint } : { state: "off" };
}

const when = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" }).format(new Date(iso));

export default function PushControls({ publicKey, devices }: { publicKey: string; devices: Device[] }) {
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const [endpoint, setEndpoint] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    detect()
      .then((d) => {
        if (!alive) return;
        setState(d.state);
        setEndpoint(d.endpoint);
      })
      .catch(() => alive && setState("unsupported"));
    return () => {
      alive = false;
    };
  }, []);

  const run = async (job: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await job();
    } catch (e) {
      notify({ kind: "error", text: (e as Error).message || "Qualcosa non ha funzionato. Riprova." });
    } finally {
      setBusy(false);
    }
  };

  const enable = () =>
    run(async () => {
      // asked first, straight from the tap: phones only allow the question right after a tap
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        notify({ kind: "error", text: "Non hai concesso il permesso: gli avvisi restano spenti." });
        return;
      }
      const reg = await activeRegistration();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      const res = await savePushSubscription(sub.toJSON(), deviceLabel());
      if (!res.ok) {
        await sub.unsubscribe().catch(() => {});
        notify({ kind: "error", text: res.error });
        return;
      }
      setEndpoint(sub.endpoint);
      setState("on");
      notify({ kind: "ok", text: res.message ?? "Avvisi attivati" });
      router.refresh();
    });

  const disable = () =>
    run(async () => {
      const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe().catch(() => {});
      }
      setEndpoint(undefined);
      setState("off");
      notify({ kind: "ok", text: "Avvisi disattivati su questo telefono" });
      router.refresh();
    });

  const test = () =>
    run(async () => {
      const res = await sendTestPush();
      notify(res.ok ? { kind: "ok", text: res.message ?? "Avviso inviato" } : { kind: "error", text: res.error });
      router.refresh();
    });

  const remove = (d: Device) =>
    run(async () => {
      const res = await removePushSubscription(d.endpoint);
      notify(res.ok ? { kind: "ok", text: res.message ?? "Rimosso" } : { kind: "error", text: res.error });
      if (d.endpoint === endpoint) {
        const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
        await (await reg?.pushManager.getSubscription())?.unsubscribe().catch(() => {});
        setEndpoint(undefined);
        setState("off");
      }
      router.refresh();
    });

  const btn = "btn btn-dark btn-sm disabled:opacity-60";
  const btnLine = "btn btn-line btn-sm !border-ink !text-ink hover:!bg-ink hover:!text-ivory disabled:opacity-60";

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start gap-3">
          <BellRing className="mt-1 h-6 w-6 shrink-0 text-gold" aria-hidden />
          <div className="min-w-0 grow">
            <h2 className="font-display text-2xl">Questo telefono</h2>

            {state === "loading" && <p className="mt-2 text-sm text-espresso/70">Controllo…</p>}

            {state === "install" && (
              <div className="mt-2 space-y-2 text-[0.95rem] leading-relaxed">
                <p>
                  <strong>Su iPhone gli avvisi funzionano solo con l&rsquo;app installata.</strong>
                </p>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Apri l&rsquo;admin da Safari, tocca Condividi e poi «Aggiungi alla schermata Home».</li>
                  <li>Apri l&rsquo;app dalla sua icona e accedi.</li>
                  <li>Torna in questa pagina e premi «Attiva gli avvisi».</li>
                </ol>
                <p className="text-sm text-espresso/70">Serve iOS 16.4 o più recente.</p>
              </div>
            )}

            {state === "unsupported" && (
              <p className="mt-2 text-[0.95rem] leading-relaxed">
                Questo browser non supporta gli avvisi. Prova con Chrome sul computer o su Android, oppure, su iPhone, con
                l&rsquo;app installata sulla schermata Home.
              </p>
            )}

            {state === "denied" && (
              <p className="mt-2 text-[0.95rem] leading-relaxed">
                <strong>Le notifiche sono bloccate.</strong> Riattivale dalle impostazioni (iPhone: Impostazioni →
                Notifiche → Duca d&rsquo;Este; Android e Chrome: impostazioni del sito → Notifiche) e poi torna qui.
              </p>
            )}

            {state === "off" && (
              <>
                <p className="mt-2 text-[0.95rem] leading-relaxed">
                  Gli avvisi sono spenti. Attivali per ricevere una notifica appena arriva qualcosa.
                </p>
                <button type="button" onClick={enable} disabled={busy} className={`${btn} mt-4`}>
                  {busy ? "Attivo…" : "Attiva gli avvisi su questo telefono"}
                </button>
              </>
            )}

            {state === "on" && (
              <>
                <p className="mt-2 text-[0.95rem] leading-relaxed">
                  <strong>Gli avvisi sono attivi su questo telefono.</strong> Riceverai una notifica per ogni nuova
                  prenotazione, ordine di torta o richiesta.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={test} disabled={busy} className={btn}>
                    {busy ? "Invio…" : "Invia un avviso di prova"}
                  </button>
                  <button type="button" onClick={disable} disabled={busy} className={btnLine}>
                    Disattiva
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <section>
        <h2 className="font-display text-3xl">Telefoni collegati</h2>
        <p className="mb-4 text-sm text-espresso/72">Tutti i dispositivi che ricevono gli avvisi. Puoi scollegarne uno quando non serve più.</p>
        {devices.length === 0 ? (
          <p className="border border-dashed border-espresso/25 p-8 text-center text-espresso/70">Nessun telefono collegato.</p>
        ) : (
          <ul className="divide-y divide-espresso/10 border border-espresso/15 bg-cream">
            {devices.map((d) => (
              <li key={d.endpoint} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <Smartphone className="h-5 w-5 shrink-0 text-gold" aria-hidden />
                <div className="min-w-0 grow">
                  <p className="font-semibold">
                    {d.label || "Telefono"}
                    {d.endpoint === endpoint && <span className="ml-2 text-sm font-normal text-espresso/70">· questo telefono</span>}
                  </p>
                  <p className="text-sm text-espresso/70">
                    Collegato il {when(d.createdAt)}
                    {d.lastOkAt && ` · ultimo avviso arrivato il ${when(d.lastOkAt)}`}
                  </p>
                  {d.lastError && <p className="text-sm text-red-800">{d.lastError}</p>}
                </div>
                <button type="button" onClick={() => remove(d)} disabled={busy} className="min-h-11 px-2 text-sm underline underline-offset-4 disabled:opacity-60">
                  Scollega
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
