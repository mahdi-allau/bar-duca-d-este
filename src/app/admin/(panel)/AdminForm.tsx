"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useRef, useTransition, type FormEvent, type ReactNode } from "react";
import type { ActionResult } from "./result";

const Pending = createContext(false);

/** The save button of an AdminForm: shows "Salvo…" while the request is running. */
export function SaveButton({
  children = "Salva",
  pendingText = "Salvo…",
  className = "btn btn-dark btn-sm",
  name,
  value,
}: {
  children?: ReactNode;
  pendingText?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const pending = useContext(Pending);
  return (
    <button type="submit" name={name} value={value} className={className} aria-disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export type ToastDetail = { kind: "ok" | "error"; text: string };

export const notify = (detail: ToastDetail) =>
  window.dispatchEvent(new CustomEvent<ToastDetail>("admin:toast", { detail }));

/**
 * A form that tells the person what happened: it disables itself while saving, then shows
 * "Salvato" or the reason it did not work. `confirm` asks before anything destructive.
 */
export default function AdminForm({
  action,
  children,
  className,
  success = "Salvato",
  confirm,
  resetOnSuccess = false,
}: {
  action: (formData: FormData) => Promise<ActionResult | void>;
  children: ReactNode;
  className?: string;
  success?: string;
  confirm?: string;
  resetOnSuccess?: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    if (confirm && !window.confirm(confirm)) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    // the submit button's own name/value (for forms that rely on it)
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.name) data.set(submitter.name, submitter.value);
    start(async () => {
      try {
        const res = await action(data);
        if (res && !res.ok) {
          notify({ kind: "error", text: res.error });
          return;
        }
        notify({ kind: "ok", text: (res && res.message) || success });
        if (resetOnSuccess) form.reset();
        router.refresh();
      } catch {
        notify({ kind: "error", text: "Non sono riuscito a salvare. Riprova tra un attimo." });
      }
    });
  };

  return (
    <form ref={ref} onSubmit={onSubmit} className={className} aria-busy={pending}>
      <Pending.Provider value={pending}>
        <fieldset disabled={pending} className="contents">
          {children}
        </fieldset>
      </Pending.Provider>
    </form>
  );
}
