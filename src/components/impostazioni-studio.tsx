"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ImageUp, Loader2, SlidersHorizontal, Trash2, UserPlus } from "lucide-react";
import { Campo, Messaggio } from "@/components/campo";
import { LogoImmagine } from "@/components/studio-contesto";
import { Pulsante } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { RUOLI } from "@/lib/dominio";
import type { MappaPermessi, RuoloConfigurabile } from "@/lib/permessi-catalogo";
import { PermessiPersonali } from "@/components/ruoli-permessi";
import { aggiornaUtente, creaUtente, impostaLogo, salvaStudio, type DatiStudioModulo } from "@/lib/azioni-studio";
import type { DatiStudio } from "@/lib/studio";
import { cn } from "@/lib/utils";

/* ── Dati dello studio e logo ─────────────────────────────────────────── */

const FORMATI_LOGO = ["image/svg+xml", "image/png", "image/jpeg", "image/webp"];

export function ImpostazioniStudio({ studio }: { studio: DatiStudio }) {
  const router = useRouter();
  const [d, setD] = useState<DatiStudioModulo>({
    nome: studio.nome,
    claim: studio.claim,
    indirizzo: studio.indirizzo,
    telefono: studio.telefono,
    email: studio.email,
    sito: studio.sito,
    partita_iva: studio.partitaIva,
  });
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  const [esitoLogo, setEsitoLogo] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();
  const [caricaLogo, avviaLogo] = useTransition();
  const file = useRef<HTMLInputElement>(null);
  const set = (campo: keyof DatiStudioModulo) => (e: { target: { value: string } }) => {
    setD({ ...d, [campo]: e.target.value });
    setEsito(null);
  };

  function salva() {
    avvia(async () => {
      const r = await salvaStudio(d);
      setEsito(r.ok ? { ok: true, testo: "Salvato: nome e claim si aggiornano in tutta l'app." } : { ok: false, testo: r.errore });
      if (r.ok) router.refresh();
    });
  }

  function scegliLogo(f: File | undefined) {
    if (!f) return;
    setEsitoLogo(null);
    if (!FORMATI_LOGO.includes(f.type)) return setEsitoLogo({ ok: false, testo: "Usa un file SVG, PNG, JPG o WebP." });
    if (f.size > 1024 * 1024) return setEsitoLogo({ ok: false, testo: "Il logo deve pesare al massimo 1 MB." });
    avviaLogo(async () => {
      const estensione = f.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const percorso = `logo/logo-${Date.now()}.${estensione}`;
      const su = await createClient().storage.from("studio").upload(percorso, f, { contentType: f.type, upsert: false });
      if (su.error) return setEsitoLogo({ ok: false, testo: "Non è stato possibile caricare il logo. Riprova." });
      const r = await impostaLogo(percorso);
      if (!r.ok) {
        await createClient().storage.from("studio").remove([percorso]);
        return setEsitoLogo({ ok: false, testo: r.errore });
      }
      setEsitoLogo({ ok: true, testo: "Logo aggiornato in tutta l'app." });
      router.refresh();
    });
    if (file.current) file.current.value = "";
  }

  function togliLogo() {
    avviaLogo(async () => {
      const r = await impostaLogo(null);
      setEsitoLogo(r.ok ? { ok: true, testo: "Logo rimosso: torna il monogramma." } : { ok: false, testo: r.errore });
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8 px-5 py-6 md:px-6">
      {/* Logo */}
      <section>
        <h3 className="mb-3 text-[0.6875rem] uppercase tracking-[0.14em] text-tenue">Logo</h3>
        <div className="flex flex-wrap items-center gap-5">
          <div className="grid h-24 w-40 place-items-center rounded-medio border border-linea bg-superficie-2/60 p-3">
            <LogoImmagine logoUrl={studio.logoUrl} nome={studio.nome} className="h-14 text-inchiostro" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <input
                ref={file}
                type="file"
                accept={FORMATI_LOGO.join(",")}
                className="sr-only"
                id="logo-studio"
                onChange={(e) => scegliLogo(e.target.files?.[0])}
              />
              <label htmlFor="logo-studio" className={cn("inline-flex h-10 cursor-pointer items-center gap-2 rounded-medio border border-linea-forte bg-superficie px-4 text-[0.9375rem] font-medium hover:bg-superficie-2", caricaLogo && "pointer-events-none opacity-60")}>
                {caricaLogo ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" strokeWidth={1.8} />}
                {studio.logoUrl ? "Sostituisci logo" : "Carica logo"}
              </label>
              {studio.logoUrl ? (
                <Pulsante type="button" variante="discreto" onClick={togliLogo} disabled={caricaLogo} className="text-[color:var(--stato-sospesa)]">
                  <Trash2 className="size-4" strokeWidth={1.8} />
                  Rimuovi
                </Pulsante>
              ) : null}
            </div>
            <p className="max-w-sm text-sm text-tenue">
              SVG o PNG con fondo trasparente, fino a 1 MB. Sui fondi scuri (testate, finestre) compare in versione chiara. Senza logo resta il monogramma.
            </p>
          </div>
        </div>
        {esitoLogo ? (
          <div className="mt-3">
            <Messaggio tipo={esitoLogo.ok ? "ok" : "errore"}>{esitoLogo.testo}</Messaggio>
          </div>
        ) : null}
      </section>

      {/* Nome e claim */}
      <section>
        <h3 className="mb-3 text-[0.6875rem] uppercase tracking-[0.14em] text-tenue">Identità</h3>
        <div className="grid gap-5 md:grid-cols-2">
          <Campo etichetta="Nome dello studio" id="s-nome" obbligatorio value={d.nome} onChange={set("nome")} aiuto="Compare nelle barre, nelle testate, nelle finestre e sui documenti." />
          <Campo etichetta="Claim" id="s-claim" value={d.claim} onChange={set("claim")} placeholder="Architettura e design" aiuto="La frase sotto il nome, anche come titolo della home." />
        </div>
      </section>

      {/* Dati riportati sui documenti */}
      <section>
        <h3 className="mb-3 text-[0.6875rem] uppercase tracking-[0.14em] text-tenue">Dati sui documenti (intestazione del preventivo)</h3>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Campo etichetta="Indirizzo" id="s-ind" value={d.indirizzo} onChange={set("indirizzo")} placeholder="Via Temistocle 2, 96100 Siracusa" />
          </div>
          <Campo etichetta="Telefono" id="s-tel" type="tel" value={d.telefono} onChange={set("telefono")} />
          <Campo etichetta="Email" id="s-email" type="email" value={d.email} onChange={set("email")} />
          <Campo etichetta="Sito" id="s-sito" value={d.sito} onChange={set("sito")} />
          <Campo etichetta="Partita IVA" id="s-piva" value={d.partita_iva} onChange={set("partita_iva")} inputMode="numeric" />
        </div>
      </section>

      {esito ? <Messaggio tipo={esito.ok ? "ok" : "errore"}>{esito.testo}</Messaggio> : null}
      <div>
        <Pulsante type="button" onClick={salva} disabled={inCorso}>
          {inCorso ? "Salvataggio…" : "Salva le impostazioni dello studio"}
        </Pulsante>
      </div>
    </div>
  );
}

/* ── Utenti e ruoli ───────────────────────────────────────────────────── */

export type UtenteStudio = { id: string; nome: string; email: string; ruolo: string; attivo: boolean; personali: MappaPermessi };

export function UtentiStudio({
  utenti,
  ioId,
  ruoli,
}: {
  utenti: UtenteStudio[];
  ioId: string;
  /** Permessi dei ruoli, base delle eccezioni personali */
  ruoli: Record<RuoloConfigurabile, MappaPermessi>;
}) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [inModifica, setInModifica] = useState<string | null>(null);
  const [aperto, setAperto] = useState<string | null>(null);
  const [, avvia] = useTransition();

  function cambia(id: string, modifica: { ruolo?: string; attivo?: boolean }) {
    setErrore(null);
    setInModifica(id);
    avvia(async () => {
      const r = await aggiornaUtente(id, modifica);
      setInModifica(null);
      if (!r.ok) return setErrore(r.errore);
      router.refresh();
    });
  }

  return (
    <div>
      <NuovoUtente />
      <ul className="divide-y divide-linea border-t border-linea">
        {utenti.map((u) => {
          const io = u.id === ioId;
          const configurabile = u.ruolo !== "titolare";
          const eccezioni = Object.keys(u.personali).length;
          return (
            <li key={u.id} className={cn("grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_13rem_5.5rem] md:items-center md:px-6", !u.attivo && "opacity-60")}>
              <div className="min-w-0">
                <p className="truncate text-[0.9375rem] font-medium">
                  {u.nome}
                  {io ? <span className="ml-2 text-[0.8125rem] font-normal text-tenue">(tu)</span> : null}
                  {!u.attivo ? <span className="ml-2 text-[0.8125rem] font-normal text-[color:var(--stato-sospesa)]">disattivato</span> : null}
                </p>
                <p className="truncate text-[0.8125rem] text-tenue">{u.email}</p>
                {configurabile ? (
                  <button
                    type="button"
                    onClick={() => setAperto(aperto === u.id ? null : u.id)}
                    aria-expanded={aperto === u.id}
                    className="mt-1 inline-flex items-center gap-1.5 text-[0.8125rem] text-accento hover:underline"
                  >
                    <SlidersHorizontal className="size-3.5" strokeWidth={1.9} />
                    Permessi personali
                    {eccezioni ? <span className="text-tenue">· {eccezioni} {eccezioni === 1 ? "eccezione" : "eccezioni"}</span> : null}
                  </button>
                ) : null}
              </div>
              <select
                aria-label={`Ruolo di ${u.nome}`}
                value={u.ruolo}
                disabled={inModifica === u.id}
                onChange={(e) => cambia(u.id, { ruolo: e.target.value })}
                className="h-10 w-full rounded-medio border border-linea-forte bg-superficie px-3 text-[0.9375rem] text-inchiostro outline-none focus:border-accento focus:ring-2 focus:ring-accento/20 disabled:opacity-60"
              >
                {Object.entries(RUOLI).map(([valore, etichetta]) => (
                  <option key={valore} value={valore}>
                    {etichetta}
                  </option>
                ))}
              </select>
              <div className="md:text-right">
                {io ? (
                  <span className="text-[0.8125rem] text-tenue">—</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => cambia(u.id, { attivo: !u.attivo })}
                    disabled={inModifica === u.id}
                    className="text-[0.875rem] text-accento hover:underline disabled:opacity-50"
                  >
                    {u.attivo ? "Disattiva" : "Riattiva"}
                  </button>
                )}
              </div>
              {configurabile && aperto === u.id ? (
                <div className="md:col-span-3">
                  <PermessiPersonali
                    key={u.ruolo}
                    id={u.id}
                    nome={u.nome}
                    ruolo={u.ruolo as RuoloConfigurabile}
                    delRuolo={ruoli[u.ruolo as RuoloConfigurabile] ?? {}}
                    personali={u.personali}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {errore ? (
        <div className="px-5 pb-4 md:px-6">
          <Messaggio tipo="errore">{errore}</Messaggio>
        </div>
      ) : null}
      <p className="border-t border-linea px-5 py-4 text-sm text-tenue md:px-6">
        Il <strong className="font-medium text-inchiostro-2">titolare</strong> ha sempre accesso completo e gestisce utenti e permessi; cosa possono fare
        architetti e collaboratori si decide in Ruoli e permessi, con eventuali eccezioni personali. Un utente disattivato non può più accedere. I nuovi
        utenti ricevono una password provvisoria da cambiare al primo accesso.
      </p>
    </div>
  );
}

/* ── Aggiunta di un utente ────────────────────────────────────────────── */

function NuovoUtente() {
  const router = useRouter();
  const [d, setD] = useState({ nome: "", cognome: "", email: "", ruolo: "collaboratore" });
  const [errore, setErrore] = useState<string | null>(null);
  const [creato, setCreato] = useState<{ email: string; password: string } | null>(null);
  const [copiato, setCopiato] = useState(false);
  const [inCorso, avvia] = useTransition();
  const set = (campo: keyof typeof d) => (e: { target: { value: string } }) => {
    setD({ ...d, [campo]: e.target.value });
    setErrore(null);
  };

  function aggiungi() {
    setErrore(null);
    setCreato(null);
    avvia(async () => {
      const r = await creaUtente(d);
      if (!r.ok) return setErrore(r.errore);
      setCreato({ email: r.email, password: r.password });
      setD({ nome: "", cognome: "", email: "", ruolo: d.ruolo });
      router.refresh();
    });
  }

  async function copia() {
    if (!creato) return;
    try {
      await navigator.clipboard.writeText(`Accesso al gestionale dello studio\nEmail: ${creato.email}\nPassword provvisoria: ${creato.password}\nAl primo accesso cambiala da Impostazioni → Cambia password.`);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 1500);
    } catch {
      // appunti non disponibili: la password resta selezionabile
    }
  }

  const campo = "h-10 w-full rounded-medio border border-linea-forte bg-superficie px-3 text-[0.9375rem] text-inchiostro outline-none placeholder:text-tenue/70 focus:border-accento focus:ring-2 focus:ring-accento/20";

  return (
    <div className="px-5 py-5 md:px-6">
      <p className="mb-3 text-[0.6875rem] uppercase tracking-[0.14em] text-tenue">Aggiungi un utente</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          aggiungi();
        }}
        className="grid gap-2 md:grid-cols-[1fr_1fr_1.4fr_11rem_auto]"
      >
        <input aria-label="Nome" placeholder="Nome" value={d.nome} onChange={set("nome")} className={campo} autoComplete="off" />
        <input aria-label="Cognome" placeholder="Cognome" value={d.cognome} onChange={set("cognome")} className={campo} autoComplete="off" />
        <input aria-label="Email" placeholder="nome@studio.it" type="email" value={d.email} onChange={set("email")} className={campo} autoComplete="off" />
        <select aria-label="Ruolo" value={d.ruolo} onChange={set("ruolo")} className={campo}>
          {Object.entries(RUOLI).map(([valore, etichetta]) => (
            <option key={valore} value={valore}>
              {etichetta}
            </option>
          ))}
        </select>
        <Pulsante type="submit" disabled={inCorso} className="h-10">
          {inCorso ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" strokeWidth={1.8} />}
          Aggiungi
        </Pulsante>
      </form>
      {errore ? (
        <div className="mt-3">
          <Messaggio tipo="errore">{errore}</Messaggio>
        </div>
      ) : null}
      {creato ? (
        <div role="status" className="mt-3 rounded-medio border border-[color:var(--stato-attiva)]/35 bg-[color:var(--stato-attiva)]/8 p-4">
          <p className="text-[0.9375rem] font-medium">Utente creato: {creato.email}</p>
          <p className="mt-1 text-sm text-inchiostro-2">
            Password provvisoria, mostrata solo ora:{" "}
            <span className="numeri select-all rounded-piccolo bg-superficie px-2 py-0.5 font-medium text-inchiostro">{creato.password}</span>
          </p>
          <p className="mt-1 text-sm text-inchiostro-2">Comunicala al collega: al primo accesso la cambierà da Impostazioni → Cambia password.</p>
          <button type="button" onClick={copia} className="mt-2 inline-flex items-center gap-1.5 text-sm text-accento hover:underline">
            {copiato ? <Check className="size-4" strokeWidth={2} /> : <Copy className="size-4" strokeWidth={1.8} />}
            {copiato ? "Copiato" : "Copia email e password"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
