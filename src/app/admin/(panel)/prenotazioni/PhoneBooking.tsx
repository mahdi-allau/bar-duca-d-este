"use client";

import { useActionState, useState } from "react";
import { createStaffReservation, type StaffState } from "./actions";

export default function PhoneBooking({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<StaffState, FormData>(createStaffReservation, null);

  return (
    <div className="mb-8">
      <button type="button" className="btn btn-dark btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "Chiudi" : "+ Nuova prenotazione (telefono / banco)"}
      </button>
      {open && (
        <form action={action} className="mt-4 grid gap-3 border border-espresso/15 bg-cream p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs">Data</span>
            <input name="date" type="date" min={today} defaultValue={today} required className="field" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs">Ora</span>
            <input name="time" type="time" required className="field" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs">Persone</span>
            <input name="partySize" type="number" min={1} max={500} defaultValue={2} required className="field" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs">Nome</span>
            <input name="firstName" required className="field" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs">Cognome (facoltativo)</span>
            <input name="lastName" className="field" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs">Telefono</span>
            <input name="phone" type="tel" className="field" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs">Email (per avvisare il cliente)</span>
            <input name="email" type="email" className="field" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs">Note</span>
            <input name="notes" className="field" />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="force" /> Forza: salva anche se l&rsquo;orario è pieno o fuori orario
          </label>
          <div className="flex items-center gap-4 sm:col-span-2">
            <button className="btn btn-dark btn-sm" disabled={pending}>
              {pending ? "Salvo…" : "Salva (già confermata)"}
            </button>
            {state?.ok && <span className="text-sm font-semibold text-emerald-800">Salvata: {state.reference}</span>}
            {state && !state.ok && (
              <span role="alert" className="text-sm font-semibold text-red-700">
                {state.error}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
