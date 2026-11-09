"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ToastDetail } from "./AdminForm";

type Toast = ToastDetail & { id: number };

/** Short confirmation at the bottom of the screen after every save. Errors stay longer. */
export default function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  const next = useRef(1);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      const id = next.current++;
      setItems([{ ...detail, id }]);
      window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), detail.kind === "error" ? 7000 : 3200);
    };
    window.addEventListener("admin:toast", onToast);
    return () => window.removeEventListener("admin:toast", onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex max-w-md items-start gap-3 px-4 py-3 text-sm shadow-lg ${
            t.kind === "error" ? "bg-red-800 text-white" : "bg-ink text-ivory"
          }`}
        >
          {t.kind === "error" ? (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-champagne" aria-hidden />
          )}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
