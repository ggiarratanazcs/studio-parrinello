# Studio Parrinello — Gestione commesse

Applicazione web per la gestione delle commesse dello Studio Parrinello (architettura e design, Siracusa).
Funziona da browser su computer e da telefono, dove si può installare come app dalla schermata Home.

## Tecnologie

- **Next.js 16** (App Router, Cache Components) con TypeScript
- **Tailwind CSS 4**, sistema di temi a variabili CSS (`src/app/globals.css`, `src/lib/temi.ts`)
- **Supabase**: autenticazione, database Postgres con RLS, archivio file (bucket privato `documenti`)
- Carattere **Archivo** (variabile, incluso nel progetto) e icone **Lucide**

## Struttura

```
src/
  app/
    (accesso)/            accesso e impostazione password (invito / recupero)
    (studio)/             area riservata: panoramica, commesse, clienti, immobili, documenti, impostazioni
    auth/conferma         verifica dei link inviati per email
    auth/esci             uscita
    manifest.ts           manifest PWA
  components/             navigazione, cartiglio (intestazione di pagina), elementi di interfaccia
  lib/
    supabase/             client browser, server e proxy di sessione
    database.types.ts     tipi generati dallo schema Supabase
    dati.ts               letture dal database (solo lato server)
    dominio.ts            etichette di stati, tipologie, ruoli
  proxy.ts                protegge le pagine: chi non è autenticato va su /accesso
supabase/
  schema_v1.sql           schema del database applicato (documentazione)
```

## Avvio in locale

```bash
cp .env.example .env.local   # e inserire URL e chiave pubblica del progetto Supabase
npm install
npm run dev
```

## Configurazione Supabase

1. **Authentication → Sign In / Providers**: disattivare "Allow new users to sign up" (si entra solo su invito).
2. **Authentication → URL Configuration**: impostare *Site URL* all'indirizzo pubblico dell'app e aggiungere
   `https://<indirizzo>/auth/conferma` tra i *Redirect URLs*.
3. **Authentication → Email Templates**: nei modelli *Invite user* e *Reset password* usare come link
   `{{ .SiteURL }}/auth/conferma?token_hash={{ .TokenHash }}&type=invite&next=/imposta-password`
   (per il recupero password: `type=recovery`).
4. I titolari si promuovono via SQL: `update profili set ruolo = 'titolare', qualifica = 'Architetto' where email = '...';`

## Pubblicazione

Il progetto è pensato per Vercel: importare il repository, impostare le variabili
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, poi Deploy.
