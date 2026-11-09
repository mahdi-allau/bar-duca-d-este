/** What an admin server action reports back, so the form can say "Salvato" or explain what is wrong. */
export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export const saved = (message = "Salvato"): ActionResult => ({ ok: true, message });
export const failed = (error: string): ActionResult => ({ ok: false, error });
