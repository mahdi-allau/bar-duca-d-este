# Duca d'Este — sito web e gestionale

Bar Pasticceria Duca d'Este, Piazzetta del Castello 22, Ferrara.
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Three.js / React Three Fiber · PostgreSQL.

## Cosa contiene

| Area | Dove | Cosa fa |
| --- | --- | --- |
| Home con scena 3D | `/` | Colazione 3D in tempo reale (cappuccino con il sigillo, cornetto, vapore, zucchero a velo, camera lenta). Su smartphone parte una versione più leggera; senza WebGL o con "risparmio dati" resta la fotografia. |
| Colazione, Pasticceria, Aperitivo | `/colazione` `/pasticceria` `/aperitivo` | Schede prodotto lette dal database, con foto, descrizione e prezzo (mostrato solo se impostato). Schema.org `Product`. |
| Crea la tua torta | `/crea-la-tua-torta` | Configuratore 3D: forma, dimensioni, pan di Spagna, farciture per strato, copertura, decorazioni, scritte, sezione tagliata, prezzo dinamico, data di ritiro, invio ordine con due anteprime (intera e sezione). |
| Prenotazione tavoli | `/prenota` | Giorni, orari e posti calcolati dal database (orari di apertura, posti, durata del tavolo, chiusure, prenotazioni già registrate). Controllo stato: `/prenota/stato`. |
| Torte ed eventi | `/torte-personalizzate` | Compleanni, anniversari, battesimi, eventi privati, catering: richiesta salvata nel database. |
| Amministrazione | `/admin` | Area protetta (vedi sotto). |
| SEO | automatico | Meta e Open Graph per pagina, `sitemap.xml`, `robots.txt`, Schema.org `LocalBusiness` / `CafeOrCoffeeShop` / `Bakery` / `Product` / `BreadcrumbList`, URL leggibili. |

## Avvio in locale

```bash
npm install
npm run dev        # http://localhost:3000
```

In locale il database è un PostgreSQL incorporato (PGlite) salvato in `.data/`: non serve installare nulla.
Le tabelle e i dati iniziali (ingredienti, prodotti, impostazioni) vengono creati al primo avvio.

L'amministratore iniziale si crea dalle variabili in `.env.local` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
Accedi da `http://localhost:3000/admin`. Per ripartire da zero basta cancellare la cartella `.data/` (con il server fermo).

## Servizi esterni necessari per la pubblicazione

1. **Un database PostgreSQL** (obbligatorio in produzione). Va bene qualsiasi servizio: Supabase, Neon, Netlify DB, un VPS.
   Imposta `DATABASE_URL` con la stringa di connessione (meglio quella "pooled"/transaction se il fornitore la offre).
   Senza `DATABASE_URL` l'app in produzione si rifiuta di partire (di proposito: i dati sarebbero persi).
2. **Un hosting con runtime Node** per Next.js (Vercel, Netlify con il suo adattatore Next, un server Node…).
   Il sito usa Server Actions e pagine dinamiche: **non è esportabile come HTML statico**.
   La versione attualmente online su Netlify (`duca-deste-ferrara.netlify.app`) è la vecchia versione statica.
3. **Variabili d'ambiente** (vedi `.env.example`):
   - `DATABASE_URL`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (usate solo se non esiste ancora nessun amministratore; dopo il primo avvio puoi toglierle)
   - `NEXT_PUBLIC_SITE_URL` (indirizzo pubblico, per canonical, sitemap, Open Graph)
   - Facoltative, per le email: `RESEND_API_KEY`, `MAIL_FROM` (mittente verificato su Resend), `NOTIFY_EMAIL_TO` (dove il locale riceve gli avvisi).
     Senza queste il sito funziona uguale, solo senza email.
4. **Email** (con le variabili sopra): al cliente arrivano la ricevuta e gli aggiornamenti di stato (prenotazione confermata/annullata, torta pronta); al locale arrivano nuove prenotazioni, ordini e richieste, e gli annullamenti fatti dal cliente. Messaggi in HTML con la grafica del locale più una versione di solo testo; se il cliente risponde, la risposta va al locale (`NOTIFY_EMAIL_TO`, altrimenti l'email in `src/lib/site.ts`). Ogni invio finisce nella tabella `mail_log` (90 giorni) e si vede in **Admin → Email**, dove c'è anche il pulsante «Invia prova». Con il mittente di prova di Resend (`onboarding@resend.dev`) partono solo gli avvisi verso l'indirizzo dell'account Resend: per scrivere ai clienti serve un dominio verificato. `RESEND_API_URL` serve solo ai test locali (server di posta finto).
5. **Non ci sono ancora** i pagamenti online (il pagamento della torta si decide a parte). Prenotazioni e ordini arrivano nel pannello; il cliente controlla lo stato su `/prenota/stato` con codice + email e da lì può annullare (tavolo: prima dell'orario; torta: fino al preavviso di ritiro).

## Pannello amministratore (`/admin`)

Login con email e password (hash scrypt, sessione in database, cookie `httpOnly`, limite ai tentativi).

**Come app sul telefono**: l'admin si può aggiungere alla schermata Home (iPhone: Safari → Condividi → «Aggiungi alla schermata Home»; Android: Chrome → «Installa app») e si apre a tutto schermo con la sua icona. Manifest e icone in `public/admin-app/` (fuori da `/admin`, che richiede il login); i meta tag sono in `src/app/admin/layout.tsx`. Non ci sono ancora notifiche push.

- **Panoramica**: conteggi, tavoli di oggi e domani, ritiri torte dei prossimi 7 giorni, cose da completare.
- **Prenotazioni tavoli**: elenco per giorno, filtri, stato (in attesa → confermata / annullata / completata / non presentato), note interne; bottoni Conferma/Annulla in un clic, link telefono/WhatsApp, e **nuova prenotazione da telefono o banco** (già confermata, con «Forza» per salvarla anche a orario pieno).
- **Ordini torte**: configurazione completa, prezzo calcolato, anteprime 3D, stato, prezzo finale modificabile, note.
- **Richieste ed eventi**: richieste dalla pagina Torte ed eventi, con stato e note; se collegate a una torta del configuratore (stessa email dell'ordine) c'è il link all'ordine con le anteprime.
- **Email**: se sono attive, mittente e indirizzo degli avvisi, prova d'invio, ultimi 30 messaggi con l'esito e il motivo di quelli non partiti.
- **Catalogo prodotti**: crea/modifica/elimina prodotti (nome, descrizione, categoria, prezzo, foto, visibilità).
- **Ingredienti torta**: nome, prezzo, colore 3D, attivo/non attivo, ordine; nuove varianti di pan di Spagna e farciture.
- **Prezzi e ritiri torte**: prezzo base, persone incluse, supplementi (persona, piano, scritta), preavviso di ritiro, ordini massimi al giorno, conferma dei prezzi.
- **Orari e disponibilità**: orari di apertura (due fasce al giorno), posti, durata del tavolo, intervallo tra gli orari, persone massime, giorni di chiusura.
- **Fotografie**: caricamento (JPG/PNG/WebP, max 4 MB) e libreria; si assegnano ai prodotti dal Catalogo.
- **Contenuti SEO**: titolo e descrizione per ogni pagina.

### Prima di aprire al pubblico

1. **Orari e disponibilità**: inserisci gli orari e i posti. Finché mancano, `/prenota` dice che le prenotazioni non sono attive (nessuna disponibilità finta).
2. **Prezzi e ritiri torte** e **Ingredienti torta**: controlla i prezzi e spunta «Prezzi confermati».
   I valori iniziali sono segnaposto: solo base 30 €, farcitura al pistacchio +5 €, fragole +4 €, cioccolato +3 €, macaron +5 € e scritta +2 € vengono dagli esempi del brief; gli altri importi (2 € per persona oltre 6, 15 € per piano) li ho scelti io per far funzionare il calcolo.
3. **Catalogo prodotti**: i prodotti sono quelli elencati nel brief, senza prezzo. Aggiungi i prezzi e le foto ufficiali.
4. **Privacy**: `/privacy` è un testo di base da far rivedere dal titolare.

## Come funziona il prezzo della torta

`base = prezzo base + (persone − persone incluse) × supplemento persona + (piani − 1) × supplemento piano`,
più il prezzo di forma, pan di Spagna, copertura, ogni farcitura diversa (una volta sola anche se usata in più strati), ogni decorazione e la scritta (una volta).
Il prezzo viene **sempre ricalcolato dal server** al momento dell'ordine con i prezzi del database: quello che arriva dal browser non conta.

## Sicurezza (in breve)

Query SQL sempre parametrizzate; validazione con Zod su ogni modulo; campo trappola anti-bot e limiti di frequenza salvati nel database;
ogni pagina e ogni azione admin controlla la sessione nel database (`requireAdmin`), non solo il cookie; le foto caricate sono riconosciute dal contenuto reale del file;
intestazioni di sicurezza in `next.config.ts`; l'area admin è `noindex` e fuori da `robots.txt`.

## Struttura del codice

```
src/app/(site)/        pagine pubbliche (+ actions.ts con le Server Actions dei moduli)
src/app/admin/         login e pannello
src/app/api/           disponibilità tavoli e foto caricate
src/components/        sezioni, hero 3D (hero3d/), configuratore (cake/)
src/lib/               dati del sito, immagini, SEO, date, modello e prezzi della torta (condivisi)
src/server/            database (db/), autenticazione, prenotazioni, ordini, impostazioni
```

Dati del locale (indirizzo, telefono, email, link): `src/lib/site.ts`. Fotografie: `src/lib/images.ts` e cartella `public/foto/`.
Palette e tipografia: `src/app/globals.css`.

## Fotografie

Quelle in `public/foto/` sono le fotografie del locale (i file `dettaglio-*` sono ritagli). Il catalogo parte usandole;
dall'admin si possono caricare e assegnare nuove foto ai prodotti. Il Castello Estense compare solo come riflesso nella vetrina:
aggiungi una sua foto in `src/lib/images.ts` se vuoi mostrarlo.

## Comandi

```bash
npm run dev      # sviluppo
npm run build    # build di produzione
npm start        # avvia la build (serve DATABASE_URL)
npm run lint
```
