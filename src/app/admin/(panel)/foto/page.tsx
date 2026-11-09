import Image from "next/image";
import { query } from "@/server/db";
import AdminForm, { SaveButton } from "../AdminForm";
import { Card, Empty, PageHeader, fmtDateTime } from "../ui";
import { deletePhoto } from "./actions";
import UploadForm from "./UploadForm";

export const metadata = { title: "Fotografie" };

export default async function Foto() {
  const media = await query<{ id: string; filename: string; size: number; created_at: Date }>(
    `SELECT id, filename, size, created_at FROM media ORDER BY created_at DESC LIMIT 200`,
  );
  const used = await query<{ image: string }>(`SELECT image FROM products WHERE image LIKE '/api/media/%'`);
  const usedSet = new Set(used.map((u) => u.image));

  return (
    <>
      <PageHeader
        title="Fotografie"
        lead="Carica qui le fotografie del locale, poi assegnale ai prodotti dalla pagina «Prodotti». Una foto già usata da un prodotto non si può eliminare."
      />
      <Card className="mb-10">
        <UploadForm />
      </Card>

      {media.length === 0 ? (
        <Empty>Non hai ancora caricato fotografie.</Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {media.map((m) => {
            const url = `/api/media/${m.id}`;
            return (
              <li key={m.id} className="border border-espresso/15 bg-cream">
                <div className="relative aspect-[4/3] bg-espresso/10">
                  <Image src={url} alt={m.filename} fill sizes="320px" className="object-cover" />
                </div>
                <div className="p-3 text-sm">
                  <p className="truncate font-semibold">{m.filename}</p>
                  <p className="text-espresso/72">
                    {(m.size / 1024).toFixed(0)} KB · {fmtDateTime(m.created_at)}
                  </p>
                  {usedSet.has(url) ? (
                    <p className="mt-2 text-emerald-800">In uso in un prodotto</p>
                  ) : (
                    <AdminForm action={deletePhoto} confirm="Eliminare questa foto?" success="Foto eliminata" className="mt-1">
                      <input type="hidden" name="id" value={m.id} />
                      <SaveButton className="min-h-11 text-red-800 underline underline-offset-4" pendingText="Elimino…">
                        Elimina
                      </SaveButton>
                    </AdminForm>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
