import "server-only";
import { randomUUID } from "node:crypto";
import { query } from "./db";

const MAX_BYTES = 4 * 1024 * 1024;

/** Detects the real image type from the first bytes, ignoring the name and type the browser claims. */
function sniff(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) {
    return "image/webp";
  }
  return null;
}

export async function saveUpload(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!file || file.size === 0) return { ok: false, error: "Nessun file selezionato." };
  if (file.size > MAX_BYTES) return { ok: false, error: "La foto supera i 4 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniff(bytes);
  if (!mime) return { ok: false, error: "Formato non supportato: usa JPG, PNG o WebP." };
  const id = randomUUID();
  await query(`INSERT INTO media (id, filename, mime, size, data) VALUES ($1,$2,$3,$4,$5)`, [
    id,
    file.name.slice(0, 120),
    mime,
    bytes.length,
    bytes,
  ]);
  return { ok: true, url: `/api/media/${id}` };
}
