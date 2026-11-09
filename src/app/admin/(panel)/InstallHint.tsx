"use client";

import { Smartphone } from "lucide-react";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
// Only on a phone or tablet, and only until the admin has been added to the home screen.
const shouldShow = () =>
  window.matchMedia("(pointer: coarse)").matches &&
  !window.matchMedia("(display-mode: standalone)").matches &&
  (navigator as Navigator & { standalone?: boolean }).standalone !== true;

/** "Use the admin like an app": how to put it on the home screen. Hidden once it is installed. */
export default function InstallHint() {
  const show = useSyncExternalStore(subscribe, shouldShow, () => false);
  if (!show) return null;
  return (
    <details className="group mt-8 border border-espresso/15 bg-cream">
      <summary className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3">
        <Smartphone className="h-5 w-5 shrink-0 text-gold" aria-hidden />
        <span className="grow font-semibold">Usa l&rsquo;admin come un&rsquo;app sul telefono</span>
        <span className="shrink-0 text-sm underline underline-offset-4 group-open:hidden">Come si fa</span>
      </summary>
      <div className="space-y-3 border-t border-espresso/10 px-4 py-4 text-[0.95rem] leading-relaxed">
        <p>
          L&rsquo;admin si apre dalla schermata Home con la sua icona, a tutto schermo e senza la barra del browser.
          Resti collegato, quindi non devi rimettere la password ogni volta.
        </p>
        <p>
          <strong>iPhone</strong> (da Safari): tocca il pulsante Condividi, poi <strong>«Aggiungi alla schermata Home»</strong>{" "}
          e conferma.
        </p>
        <p>
          <strong>Android</strong> (da Chrome): tocca i tre puntini in alto, poi <strong>«Installa app»</strong> oppure{" "}
          <strong>«Aggiungi a schermata Home»</strong>.
        </p>
      </div>
    </details>
  );
}
