"use client";

import { useActionState, useEffect } from "react";
import { notify } from "../AdminForm";
import { uploadPhotos } from "./actions";

export default function UploadForm() {
  const [state, action, pending] = useActionState(uploadPhotos, null);

  useEffect(() => {
    if (state) notify({ kind: state.ok ? "ok" : "error", text: state.message });
  }, [state]);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Scegli le foto</span>
        <input type="file" name="files" multiple accept="image/jpeg,image/png,image/webp" required className="field" />
        <span className="mt-1.5 block text-xs text-espresso/72">JPG, PNG o WebP, massimo 4 MB ciascuna, fino a 10 per volta.</span>
      </label>
      <button disabled={pending} className="btn btn-dark btn-sm disabled:opacity-60">
        {pending ? "Caricamento…" : "Carica le foto"}
      </button>
    </form>
  );
}
