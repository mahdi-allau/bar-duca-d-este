import { query } from "@/server/db";
import { pushConfigured, pushPublicKey, type SubRow } from "@/server/push";
import { Notice, PageHeader } from "../ui";
import PushControls, { type Device } from "./PushControls";

export const metadata = { title: "Avvisi sul telefono" };

export default async function Avvisi() {
  const configured = pushConfigured();
  const rows = await query<SubRow>(`SELECT * FROM push_subscriptions ORDER BY created_at`);
  const devices: Device[] = rows.map((r) => ({
    endpoint: r.endpoint,
    label: r.label,
    createdAt: new Date(r.created_at).toISOString(),
    lastOkAt: r.last_ok_at ? new Date(r.last_ok_at).toISOString() : null,
    lastError: r.last_error,
  }));

  return (
    <>
      <PageHeader
        title="Avvisi sul telefono"
        lead="Una notifica sul telefono appena arriva una prenotazione, un ordine di torta o una richiesta, anche con l'app chiusa. Sull'icona dell'app compare il numero di cose da gestire."
      />

      {!configured ? (
        <Notice tone="warn">
          <strong>Gli avvisi non sono ancora configurati sul sito.</strong> Servono le chiavi <code>VAPID_PUBLIC_KEY</code> e{" "}
          <code>VAPID_PRIVATE_KEY</code> (si generano con <code>npx web-push generate-vapid-keys</code>).
        </Notice>
      ) : (
        <>
          <Notice tone="info">
            <strong>Cosa ricevi:</strong> nuove prenotazioni, nuovi ordini di torta, nuove richieste, e gli annullamenti fatti
            dal cliente. Toccando la notifica si apre la pagina giusta dell&rsquo;admin.
          </Notice>
          <PushControls publicKey={pushPublicKey()} devices={devices} />
        </>
      )}
    </>
  );
}
