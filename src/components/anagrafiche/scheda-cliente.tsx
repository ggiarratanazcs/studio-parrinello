"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Copy, Mail, MapPin, Pencil, Phone, Plus, Star, Trash2, User, X } from "lucide-react";
import { Campo, AreaTesto, Messaggio, Segmenti } from "@/components/campo";
import { SceltaLocalita } from "@/components/procedura/scelta-localita";
import { classePillola } from "@/components/anagrafiche/carta";
import { useInFinestra } from "@/components/anagrafiche/finestra-anagrafica";
import { TIPI_CLIENTE } from "@/lib/dominio";
import { cn, formattaData, formattaEuro } from "@/lib/utils";
import {
  cercaDoppioniCliente,
  eliminaReferente,
  salvaCliente,
  salvaReferente,
  type DatiCliente,
  type DatiReferente,
  type PossibileDoppione,
} from "@/lib/azioni-anagrafiche";
import type { AnalisiCliente, Cliente, PraticaCliente, Referente, SchedaClienteDati } from "@/lib/anagrafiche";

/* ──────────────────────────────────────────────────────────────────────────
   Scheda del cliente, impostazione "profilo con colonna":
   a sinistra identità, dati da copiare e referenti; a destra le pratiche avute
   con lo studio (pre-fattibilità, preventivi, commesse) e l'analisi a indicatori.
   Senza dati (scheda = null) si apre vuota in modifica: è la creazione dal "+".
   ────────────────────────────────────────────────────────────────────────── */

const vuoto: DatiCliente = {
  tipo: "persona_fisica",
  nome: "",
  cognome: "",
  ragione_sociale: "",
  codice_fiscale: "",
  partita_iva: "",
  codice_sdi: "",
  codice_ipa: "",
  pec: "",
  email: "",
  telefono: "",
  indirizzo: "",
  cap: "",
  comune: "",
  provincia: "",
  fonte: "",
  note: "",
};

function daCliente(c: Cliente): DatiCliente {
  return {
    tipo: (c.tipo as DatiCliente["tipo"]) ?? "persona_fisica",
    nome: c.nome ?? "",
    cognome: c.cognome ?? "",
    ragione_sociale: c.ragione_sociale ?? "",
    codice_fiscale: c.codice_fiscale ?? "",
    partita_iva: c.partita_iva ?? "",
    codice_sdi: c.codice_sdi ?? "",
    codice_ipa: c.codice_ipa ?? "",
    pec: c.pec ?? "",
    email: c.email ?? "",
    telefono: c.telefono ?? "",
    indirizzo: c.indirizzo ?? "",
    cap: c.cap ?? "",
    comune: c.comune ?? "",
    provincia: c.provincia ?? "",
    fonte: c.fonte ?? "",
    note: c.note ?? "",
  };
}

/** Colore del quadrato con l'icona, per tipo di cliente */
const COLORE_TIPO: Record<string, string> = {
  persona_fisica: "var(--stato-attiva)",
  azienda: "var(--stato-preventivo)",
  ente_pubblico: "var(--stato-prefattibilita)",
};

/** Icona del tipo di cliente: persona per i privati, edificio per le aziende, edificio con "PA" per gli enti. */
function IconaTipo({ tipo }: { tipo: string }) {
  const Icona = tipo === "persona_fisica" ? User : Building2;
  return (
    <span aria-hidden className="relative grid size-14 shrink-0 place-items-center rounded-[14px] text-white" style={{ background: COLORE_TIPO[tipo] ?? "var(--tenue)" }}>
      <Icona className="size-6" strokeWidth={1.6} />
      {tipo === "ente_pubblico" ? (
        <span className="absolute -right-2 -top-2 rounded-full border border-linea-forte bg-superficie px-1.5 py-px text-[0.625rem] font-semibold leading-tight tracking-[0.06em] text-inchiostro">
          PA
        </span>
      ) : null}
    </span>
  );
}

const classeIcona =
  "grid size-9 shrink-0 place-items-center rounded-full border border-linea-forte bg-superficie text-tenue transition-colors hover:bg-superficie-2 hover:text-inchiostro";

/** Chiusura: in finestra torna indietro, a pagina intera porta all'elenco. */
function Chiudi() {
  const inFinestra = useInFinestra();
  const router = useRouter();
  return inFinestra ? (
    <button type="button" onClick={() => router.back()} className={classeIcona} aria-label="Chiudi" data-suggerimento="Chiudi (Esc)" data-suggerimento-lato="sotto">
      <X className="size-4" strokeWidth={1.8} />
    </button>
  ) : (
    <Link href="/clienti" className={classeIcona} aria-label="Torna ai clienti">
      <X className="size-4" strokeWidth={1.8} />
    </Link>
  );
}

export function SchedaCliente({ scheda }: { scheda: SchedaClienteDati | null }) {
  const [modifica, setModifica] = useState(!scheda);
  return (
    <article className="scheda-profilo overflow-hidden rounded-piccolo border border-linea-forte bg-superficie">
      {modifica ? (
        <ModuloCliente scheda={scheda} onFatto={() => setModifica(false)} />
      ) : scheda ? (
        <VistaCliente scheda={scheda} onModifica={() => setModifica(true)} />
      ) : null}
    </article>
  );
}

/* ── Lettura ──────────────────────────────────────────────────────────── */

function VistaCliente({ scheda, onModifica }: { scheda: SchedaClienteDati; onModifica: () => void }) {
  const { cliente: c, referenti } = scheda;
  const [vista, setVista] = useState<"pratiche" | "analisi">("pratiche");
  const ente = c.tipo === "ente_pubblico";
  const localita = [c.cap, c.comune, c.provincia ? `(${c.provincia})` : null].filter(Boolean).join(" ");
  const sede = [c.indirizzo, localita].filter(Boolean).join(", ");
  const scrivi = c.pec ?? c.email;
  const totale = scheda.prefattibilita.length + scheda.preventivi.length + scheda.commesse.length;

  return (
    <div className="grid lg:h-full lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
      {/* ── Colonna dell'identità ── */}
      <aside className="border-b border-linea bg-superficie-2/45 px-5 py-6 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-6 lg:py-7">
        <div className="flex items-start justify-between gap-3">
          <IconaTipo tipo={c.tipo} />
          <span className="lg:hidden">
            <Chiudi />
          </span>
        </div>
        <h1 className="titolo-display mt-4 text-[1.5rem] leading-tight">{c.denominazione ?? "Senza nome"}</h1>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Etichetta>{TIPI_CLIENTE[c.tipo] ?? c.tipo}</Etichetta>
        </div>

        <div className="mt-4 flex gap-2">
          {scrivi ? (
            <a href={`mailto:${scrivi}`} className={classeIcona} aria-label={`Scrivi a ${scrivi}`} data-suggerimento={c.pec ? "Scrivi alla PEC" : "Scrivi"} data-suggerimento-lato="sotto">
              <Mail className="size-4" strokeWidth={1.8} />
            </a>
          ) : null}
          {c.telefono ? (
            <a href={`tel:${c.telefono.replace(/\s+/g, "")}`} className={classeIcona} aria-label={`Chiama ${c.telefono}`} data-suggerimento="Chiama" data-suggerimento-lato="sotto">
              <Phone className="size-4" strokeWidth={1.8} />
            </a>
          ) : null}
          {sede ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sede)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={classeIcona}
              aria-label="Apri la sede sulla mappa"
              data-suggerimento="Sede sulla mappa"
              data-suggerimento-lato="sotto"
            >
              <MapPin className="size-4" strokeWidth={1.8} />
            </a>
          ) : null}
          <button type="button" onClick={onModifica} className={classeIcona} aria-label="Modifica" data-suggerimento="Modifica" data-suggerimento-lato="sotto">
            <Pencil className="size-4" strokeWidth={1.8} />
          </button>
        </div>

        <dl className="mt-6 flex flex-col gap-3.5">
          {c.tipo !== "persona_fisica" ? <DatoCopiabile voce="Partita IVA" valore={c.partita_iva} codice /> : null}
          <DatoCopiabile voce="Codice fiscale" valore={c.codice_fiscale} codice />
          {ente ? <DatoCopiabile voce="Codice IPA" valore={c.codice_ipa} codice /> : <DatoCopiabile voce="Codice SDI" valore={c.codice_sdi} codice />}
          <DatoCopiabile voce="PEC" valore={c.pec} />
          <DatoCopiabile voce="Email" valore={c.email} />
          <DatoCopiabile voce="Telefono" valore={c.telefono} />
          <DatoCopiabile voce="Sede" valore={sede || null} />
        </dl>

        <Referenti clienteId={c.id} referenti={referenti} ente={ente} />

        {c.fonte || c.note ? (
          <div className="mt-7">
            <TitoloColonna>Note</TitoloColonna>
            {c.fonte ? <p className="text-[0.875rem] text-inchiostro-2">Ci ha conosciuti: {c.fonte}</p> : null}
            {c.note ? <p className="mt-1.5 whitespace-pre-line text-[0.875rem] text-inchiostro-2">{c.note}</p> : null}
          </div>
        ) : null}
      </aside>

      {/* ── Pratiche e analisi ── */}
      <section className="min-w-0 px-5 py-6 lg:overflow-y-auto lg:px-8 lg:py-7">
        <div className="flex items-center justify-between gap-3">
          <div role="tablist" aria-label="Sezioni" className="inline-flex gap-1 rounded-full bg-superficie-2 p-1">
            {(
              [
                ["pratiche", `Pratiche${totale ? ` · ${totale}` : ""}`],
                ["analisi", "Analisi"],
              ] as const
            ).map(([valore, etichetta]) => (
              <button
                key={valore}
                type="button"
                role="tab"
                aria-selected={vista === valore}
                onClick={() => setVista(valore)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[0.875rem] transition-colors",
                  vista === valore ? "bg-superficie text-inchiostro shadow-[0_0_0_1px_var(--linea)]" : "text-tenue hover:text-inchiostro",
                )}
              >
                {etichetta}
              </button>
            ))}
          </div>
          <span className="hidden lg:block">
            <Chiudi />
          </span>
        </div>

        {vista === "pratiche" ? (
          <div className="mt-6 flex flex-col gap-6">
            <GruppoPratiche titolo="Pre-fattibilità" pratiche={scheda.prefattibilita} vuoto="Nessuna pre-fattibilità per questo cliente." importo="Onorario" />
            <GruppoPratiche titolo="Preventivi" pratiche={scheda.preventivi} vuoto="Nessun preventivo per questo cliente." importo="Imponibile" />
            <GruppoPratiche titolo="Commesse" pratiche={scheda.commesse} vuoto="Nessuna commessa per questo cliente." importo="Onorario" />
          </div>
        ) : (
          <Analisi a={scheda.analisi} />
        )}
      </section>
    </div>
  );
}

function Etichetta({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-superficie px-2.5 py-0.5 text-[0.75rem] text-inchiostro-2 shadow-[0_0_0_1px_var(--linea)]">{children}</span>;
}

function TitoloColonna({ children, azione }: { children: ReactNode; azione?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="text-[0.6875rem] uppercase tracking-[0.14em] text-tenue">{children}</h2>
      {azione}
    </div>
  );
}

/** Dato con pulsante per copiarlo negli appunti. */
function DatoCopiabile({ voce, valore, codice }: { voce: string; valore: string | null; codice?: boolean }) {
  const [copiato, setCopiato] = useState(false);
  async function copia() {
    if (!valore) return;
    try {
      await navigator.clipboard.writeText(valore);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 1500);
    } catch {
      // appunti non disponibili: nessun messaggio, il dato resta selezionabile
    }
  }
  return (
    <div className="group">
      <dt className="text-[0.75rem] text-tenue">{voce}</dt>
      <dd className="mt-0.5 flex items-start gap-1.5">
        <span
          className={cn(
            "min-w-0 flex-1 [overflow-wrap:anywhere]",
            // Gli indirizzi email lunghi (PEC degli enti) stanno su una riga con un corpo appena più piccolo
            valore?.includes("@") ? "text-[0.8125rem] leading-6" : "text-[0.9375rem]",
            codice && "numeri tracking-[0.02em]",
            !valore && "text-tenue",
          )}
        >
          {valore ?? "—"}
        </span>
        {valore ? (
          <button
            type="button"
            onClick={copia}
            className="grid size-6 shrink-0 place-items-center rounded-full text-tenue opacity-100 transition-opacity hover:text-inchiostro md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            aria-label={copiato ? `${voce} copiato` : `Copia ${voce}`}
          >
            {copiato ? <Check className="size-3.5 text-[color:var(--stato-attiva)]" strokeWidth={2.2} /> : <Copy className="size-3.5" strokeWidth={1.8} />}
          </button>
        ) : null}
      </dd>
    </div>
  );
}

function GruppoPratiche({ titolo, pratiche, vuoto, importo }: { titolo: string; pratiche: PraticaCliente[]; vuoto: string; importo: string }) {
  // Aperti i gruppi con qualcosa dentro, chiusi quelli vuoti
  const [aperto, setAperto] = useState(pratiche.length > 0);
  return (
    <section>
      <button
        type="button"
        onClick={() => setAperto(!aperto)}
        aria-expanded={aperto}
        className="flex w-full items-center justify-between gap-3 border-b border-linea pb-2 text-left"
      >
        <span className="flex items-center gap-2">
          <ChevronDown
            aria-hidden
            className={cn("size-4 text-tenue transition-transform duration-200", !aperto && "-rotate-90")}
            strokeWidth={1.8}
          />
          <span className="text-[1rem] font-medium">{titolo}</span>
          <span className="numeri text-[0.875rem] text-tenue">{pratiche.length}</span>
        </span>
        {aperto && pratiche.length ? <span className="text-[0.75rem] text-tenue">{importo}</span> : null}
      </button>
      {!aperto ? null : pratiche.length === 0 ? (
        <p className="py-2.5 text-[0.875rem] text-tenue">{vuoto}</p>
      ) : (
        <ul className="pt-1">
          {pratiche.map((p) => (
            <li key={p.id}>
              <Link
                href={p.href}
                className="-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 rounded-piccolo px-2 py-2.5 transition-colors hover:bg-superficie-2/60"
              >
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2 text-[0.9375rem]">
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: p.colore }} />
                    <span className="truncate">
                      {p.sigla ? <span className="numeri text-tenue">{p.sigla} · </span> : null}
                      {p.titolo}
                    </span>
                  </span>
                  <span className="block truncate pl-3.5 text-[0.8125rem] text-tenue">
                    {[p.statoEtichetta, p.data ? formattaData(p.data) : null, p.luogo].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="numeri text-right text-[0.9375rem]">{p.importo != null ? formattaEuro(p.importo) : <span className="text-tenue">—</span>}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Analisi ──────────────────────────────────────────────────────────── */

const percento = new Intl.NumberFormat("it-IT", { style: "percent", maximumFractionDigits: 0 });

function Analisi({ a }: { a: AnalisiCliente }) {
  const chiusi = a.preventiviAccettati + a.preventiviRifiutati;
  const tasso = chiusi ? a.preventiviAccettati / chiusi : null;
  const barra = a.preventiviEmessi || 1;

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Indicatore
        voce="Onorari acquisiti"
        valore={a.commesse ? formattaEuro(a.onorariAcquisiti) : "—"}
        nota={a.commesse ? `${a.commesse} ${a.commesse === 1 ? "commessa" : "commesse"}, ${a.commesseInCorso} in corso` : "Nessuna commessa"}
        evidenza
      />

      <Indicatore
        voce="Preventivi accettati"
        valore={tasso == null ? "—" : percento.format(tasso)}
        nota={
          !a.preventiviEmessi
            ? "Nessun preventivo inviato"
            : chiusi
              ? `${a.preventiviAccettati} ${a.preventiviAccettati === 1 ? "accettato" : "accettati"} su ${chiusi} con esito`
              : "Nessun preventivo ancora con esito"
        }
      >
        {a.preventiviEmessi ? (
          <>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-superficie-2" aria-hidden>
              <span style={{ width: `${(a.preventiviAccettati / barra) * 100}%`, background: "var(--stato-attiva)" }} />
              <span style={{ width: `${(a.preventiviRifiutati / barra) * 100}%`, background: "var(--stato-sospesa)" }} />
              <span style={{ width: `${(a.preventiviInAttesa / barra) * 100}%`, background: "var(--stato-preventivo)" }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.75rem] text-tenue">
              <Legenda colore="var(--stato-attiva)">Accettati {a.preventiviAccettati}</Legenda>
              <Legenda colore="var(--stato-sospesa)">Rifiutati {a.preventiviRifiutati}</Legenda>
              <Legenda colore="var(--stato-preventivo)">In attesa {a.preventiviInAttesa}</Legenda>
            </div>
          </>
        ) : null}
      </Indicatore>

      <Indicatore
        voce="Valore preventivato"
        valore={a.preventiviEmessi ? formattaEuro(a.valorePreventivato) : "—"}
        nota={a.preventiviEmessi ? `di cui accettato ${formattaEuro(a.valoreAccettato)}` : "Imponibile dei preventivi inviati"}
      />

      <Indicatore
        voce="Pre-fattibilità convertite"
        valore={a.prefattibilita ? `${a.prefattibilitaConvertite} su ${a.prefattibilita}` : "—"}
        nota={a.prefattibilita ? "diventate preventivo o commessa" : "Nessuna pre-fattibilità"}
      />

      <Indicatore
        voce="Integrativi accettati"
        valore={a.integrativiAccettati ? formattaEuro(a.valoreIntegrativi) : "—"}
        nota={a.integrativiAccettati ? `${a.integrativiAccettati} ${a.integrativiAccettati === 1 ? "integrativo" : "integrativi"} sulle commesse` : "Nessun integrativo"}
      />

      <Indicatore
        voce="Valore medio di un preventivo"
        valore={a.preventiviEmessi ? formattaEuro(a.valorePreventivato / a.preventiviEmessi) : "—"}
        nota={a.preventiviEmessi ? `su ${a.preventiviEmessi} ${a.preventiviEmessi === 1 ? "preventivo" : "preventivi"} inviati` : "—"}
      />

      <p className="text-[0.75rem] text-tenue sm:col-span-2 xl:col-span-3">
        Esclusi i preventivi in bozza; gli integrativi sono contati a parte. Commesse perse o annullate non rientrano negli onorari.
      </p>
    </div>
  );
}

function Indicatore({ voce, valore, nota, evidenza, children }: { voce: string; valore: string; nota: string; evidenza?: boolean; children?: ReactNode }) {
  return (
    <div className={cn("rounded-medio border border-linea px-4 py-4", evidenza ? "bg-superficie-2/70" : "bg-superficie")}>
      <p className="text-[0.75rem] text-tenue">{voce}</p>
      <p className="numeri mt-1.5 text-[1.5rem] font-medium leading-none" style={{ fontVariationSettings: '"wdth" 108' }}>
        {valore}
      </p>
      <p className="mt-2 text-[0.8125rem] text-inchiostro-2">{nota}</p>
      {children}
    </div>
  );
}

function Legenda({ colore, children }: { colore: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: colore }} />
      {children}
    </span>
  );
}

/* ── Referenti ────────────────────────────────────────────────────────── */

const referenteVuoto: DatiReferente = { nome: "", ruolo: "", email: "", telefono: "", note: "", principale: false };

function Referenti({ clienteId, referenti, ente }: { clienteId: string; referenti: Referente[]; ente: boolean }) {
  const router = useRouter();
  // null = nessun modulo aperto; "nuovo" = aggiunta; id = modifica di quel referente
  const [aperto, setAperto] = useState<string | null>(null);
  const [dati, setDati] = useState<DatiReferente>(referenteVuoto);
  const [errore, setErrore] = useState<string | null>(null);
  const [daEliminare, setDaEliminare] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  function apri(r?: Referente) {
    setErrore(null);
    setDaEliminare(null);
    setDati(
      r
        ? { nome: r.nome, ruolo: r.ruolo ?? "", email: r.email ?? "", telefono: r.telefono ?? "", note: r.note ?? "", principale: r.principale }
        : { ...referenteVuoto, principale: referenti.length === 0 },
    );
    setAperto(r ? r.id : "nuovo");
  }

  function salva() {
    avvia(async () => {
      const esito = await salvaReferente(clienteId, aperto === "nuovo" ? null : aperto, dati);
      if (!esito.ok) return setErrore(esito.errore);
      setAperto(null);
      router.refresh();
    });
  }

  function elimina(id: string) {
    avvia(async () => {
      const esito = await eliminaReferente(id);
      if (!esito.ok) return setErrore(esito.errore);
      setDaEliminare(null);
      router.refresh();
    });
  }

  const set = (campo: keyof Omit<DatiReferente, "principale">) => (e: { target: { value: string } }) => setDati({ ...dati, [campo]: e.target.value });

  const modulo = (
    <div className="mt-2 flex flex-col gap-3.5 rounded-medio border border-linea bg-superficie p-3.5">
      <Campo etichetta="Nome e cognome" id="r-nome" obbligatorio value={dati.nome} onChange={set("nome")} autoComplete="off" autoFocus />
      <Campo etichetta="Ruolo" id="r-ruolo" value={dati.ruolo} onChange={set("ruolo")} placeholder={ente ? "RUP" : "Amministratore di condominio"} />
      <Campo etichetta="Email" id="r-email" type="email" value={dati.email} onChange={set("email")} />
      <Campo etichetta="Telefono" id="r-tel" type="tel" value={dati.telefono} onChange={set("telefono")} />
      <Campo etichetta="Note" id="r-note" value={dati.note} onChange={set("note")} placeholder="Reperibile al mattino" />
      <label className="flex w-fit cursor-pointer items-center gap-2 text-[0.875rem]">
        <input type="checkbox" checked={dati.principale} onChange={(e) => setDati({ ...dati, principale: e.target.checked })} className="size-4 accent-[var(--accento)]" />
        Referente principale
      </label>
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={salva} disabled={inCorso} className={cn(classePillola, "border-inchiostro bg-inchiostro text-superficie hover:bg-inchiostro/90")}>
          {inCorso ? "Salvataggio…" : aperto === "nuovo" ? "Aggiungi" : "Salva"}
        </button>
        <button type="button" onClick={() => setAperto(null)} disabled={inCorso} className={classePillola}>
          Annulla
        </button>
      </div>
    </div>
  );

  return (
    <div className="mt-7">
      <TitoloColonna
        azione={
          aperto === null ? (
            <button type="button" onClick={() => apri()} className="inline-flex items-center gap-1 text-[0.8125rem] text-accento hover:underline">
              <Plus className="size-3.5" strokeWidth={2} />
              Aggiungi
            </button>
          ) : null
        }
      >
        Referenti
      </TitoloColonna>
      {referenti.length === 0 && aperto !== "nuovo" ? (
        <p className="text-[0.875rem] text-tenue">{ente ? "Aggiungi il RUP o l'ufficio di riferimento." : "Nessun referente oltre al cliente."}</p>
      ) : null}
      <ul className="flex flex-col gap-1">
        {referenti.map((r) =>
          aperto === r.id ? (
            <li key={r.id}>{modulo}</li>
          ) : (
            <li key={r.id} className="group -mx-2 flex items-start gap-2.5 rounded-medio px-2 py-2 hover:bg-superficie/70">
              <span aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-linea-forte bg-superficie text-[0.6875rem] text-inchiostro-2">
                {r.nome
                  .split(/\s+/)
                  .filter((p) => p.length > 1 && !/^(ing|arch|geom|dott|avv|sig|sig\.ra)\.?$/i.test(p))
                  .slice(0, 2)
                  .map((p) => p.charAt(0))
                  .join("")
                  .toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[0.875rem]">
                  <span className="truncate font-medium">{r.nome}</span>
                  {r.principale ? <Star aria-label="Referente principale" className="size-3 shrink-0 fill-current text-[color:var(--stato-preventivo)]" strokeWidth={1.5} /> : null}
                </p>
                {r.ruolo ? <p className="text-[0.8125rem] text-inchiostro-2">{r.ruolo}</p> : null}
                <p className="flex flex-col text-[0.8125rem] text-tenue">
                  {r.email ? <a href={`mailto:${r.email}`} className="truncate hover:text-accento">{r.email}</a> : null}
                  {r.telefono ? <a href={`tel:${r.telefono.replace(/\s+/g, "")}`} className="numeri hover:text-accento">{r.telefono}</a> : null}
                  {r.note ? <span>{r.note}</span> : null}
                </p>
                {daEliminare === r.id ? (
                  <p className="mt-1 flex items-center gap-2 text-[0.8125rem]">
                    Eliminare?
                    <button type="button" onClick={() => elimina(r.id)} disabled={inCorso} className="text-[color:var(--stato-sospesa)] hover:underline">
                      Sì
                    </button>
                    <button type="button" onClick={() => setDaEliminare(null)} className="text-tenue hover:underline">
                      No
                    </button>
                  </p>
                ) : null}
              </div>
              {aperto === null && daEliminare !== r.id ? (
                <span className="flex shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                  <button type="button" onClick={() => apri(r)} className="grid size-7 place-items-center rounded-full text-tenue hover:bg-superficie-2 hover:text-inchiostro" aria-label={`Modifica ${r.nome}`}>
                    <Pencil className="size-3.5" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setErrore(null);
                      setDaEliminare(r.id);
                    }}
                    className="grid size-7 place-items-center rounded-full text-tenue hover:bg-superficie-2 hover:text-[color:var(--stato-sospesa)]"
                    aria-label={`Elimina ${r.nome}`}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.8} />
                  </button>
                </span>
              ) : null}
            </li>
          ),
        )}
      </ul>
      {aperto === "nuovo" ? modulo : null}
      {errore && aperto === null ? (
        <div className="mt-2">
          <Messaggio tipo="errore">{errore}</Messaggio>
        </div>
      ) : null}
    </div>
  );
}

/* ── Modifica e creazione ─────────────────────────────────────────────── */

function SezioneModulo({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[0.6875rem] uppercase tracking-[0.14em] text-tenue">{titolo}</h2>
      {children}
    </section>
  );
}

function ModuloCliente({ scheda, onFatto }: { scheda: SchedaClienteDati | null; onFatto: () => void }) {
  const router = useRouter();
  const inFinestra = useInFinestra();
  const id = scheda?.cliente.id ?? null;
  const [d, setD] = useState<DatiCliente>(scheda ? daCliente(scheda.cliente) : vuoto);
  const [errori, setErrori] = useState<Record<string, string>>({});
  const [errore, setErrore] = useState<string | null>(null);
  const [doppioni, setDoppioni] = useState<PossibileDoppione[] | null>(null);
  const [inCorso, avvia] = useTransition();

  const set = (campo: keyof DatiCliente) => (e: { target: { value: string } }) => {
    setD({ ...d, [campo]: e.target.value });
    if (errori[campo]) setErrori({ ...errori, [campo]: "" });
    setDoppioni(null);
  };

  function salva(confermato: boolean) {
    setErrore(null);
    avvia(async () => {
      if (!confermato) {
        const trovati = await cercaDoppioniCliente(d, id);
        if (trovati.length) {
          setDoppioni(trovati);
          return;
        }
      }
      const esito = await salvaCliente(id, d);
      if (!esito.ok) {
        setErrore(esito.errore);
        if ("errori" in esito) setErrori(esito.errori);
        setDoppioni(null);
        return;
      }
      if (id) {
        onFatto();
        router.refresh();
      } else {
        router.replace(`/clienti/${esito.id}`);
      }
    });
  }

  function annulla() {
    if (id) onFatto();
    else if (inFinestra) router.back();
    else router.push("/clienti");
  }

  const privato = d.tipo === "persona_fisica";
  const ente = d.tipo === "ente_pubblico";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        salva(false);
      }}
      noValidate
      className="px-5 py-6 md:px-8 md:py-7 lg:h-full lg:overflow-y-auto"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-tenue">{id ? "Modifica cliente" : "Nuovo cliente"}</p>
          <h1 className="titolo-display mt-1 text-[1.5rem] leading-tight md:text-[1.875rem]">
            {(privato ? [d.cognome, d.nome].filter(Boolean).join(" ") : d.ragione_sociale) || (id ? "Cliente" : "Nuovo cliente")}
          </h1>
        </div>
        <Chiudi />
      </header>

      <div className="mt-7 flex flex-col gap-8">
        <Segmenti
          etichetta="Tipo di cliente"
          valore={d.tipo}
          opzioni={[
            { valore: "persona_fisica", etichetta: "Privato" },
            { valore: "azienda", etichetta: "Azienda" },
            { valore: "ente_pubblico", etichetta: "Ente pubblico" },
          ]}
          onCambia={(tipo) => {
            setD({ ...d, tipo });
            setErrori({});
            setDoppioni(null);
          }}
        />

        <SezioneModulo titolo={privato ? "Persona" : ente ? "Ente" : "Società"}>
          <div className="grid gap-5 md:grid-cols-2">
            {privato ? (
              <>
                <Campo etichetta="Cognome" id="c-cognome" obbligatorio value={d.cognome} onChange={set("cognome")} errore={errori.cognome} autoComplete="off" autoFocus={!id} />
                <Campo etichetta="Nome" id="c-nome" value={d.nome} onChange={set("nome")} autoComplete="off" />
              </>
            ) : (
              <div className="md:col-span-2">
                <Campo
                  etichetta={ente ? "Denominazione dell'ente" : "Ragione sociale"}
                  id="c-rs"
                  obbligatorio
                  value={d.ragione_sociale}
                  onChange={set("ragione_sociale")}
                  errore={errori.ragione_sociale}
                  placeholder={ente ? "Comune di Noto" : "Rossi Immobiliare S.r.l."}
                  autoFocus={!id}
                />
              </div>
            )}
          </div>
        </SezioneModulo>

        <SezioneModulo titolo="Dati fiscali">
          <div className="grid gap-5 md:grid-cols-2">
            {!privato ? <Campo etichetta="Partita IVA" id="c-piva" value={d.partita_iva} onChange={set("partita_iva")} inputMode="numeric" autoComplete="off" /> : null}
            <Campo etichetta="Codice fiscale" id="c-cf" value={d.codice_fiscale} onChange={set("codice_fiscale")} className="uppercase" autoComplete="off" />
            {ente ? (
              <Campo etichetta="Codice univoco ufficio (IPA)" id="c-ipa" value={d.codice_ipa} onChange={set("codice_ipa")} className="uppercase" aiuto="Per la fattura elettronica alla pubblica amministrazione." />
            ) : (
              <Campo etichetta="Codice destinatario SDI" id="c-sdi" value={d.codice_sdi} onChange={set("codice_sdi")} className="uppercase" />
            )}
          </div>
        </SezioneModulo>

        <SezioneModulo titolo="Recapiti e sede">
          <div className="grid gap-5 md:grid-cols-2">
            <Campo etichetta="PEC" id="c-pec" type="email" value={d.pec} onChange={set("pec")} errore={errori.pec} />
            <Campo etichetta="Email" id="c-email" type="email" value={d.email} onChange={set("email")} errore={errori.email} />
            <Campo etichetta="Telefono" id="c-tel" type="tel" value={d.telefono} onChange={set("telefono")} />
            <Campo etichetta="Indirizzo" id="c-ind" value={d.indirizzo} onChange={set("indirizzo")} placeholder="Via Roma 12" />
            <SceltaLocalita
              prefisso="c"
              comuneObbligatorio={false}
              valore={{ provincia: d.provincia, comune: d.comune, cap: d.cap }}
              onCambia={(v) => setD({ ...d, provincia: v.provincia, comune: v.comune, cap: v.cap })}
            />
          </div>
        </SezioneModulo>

        <SezioneModulo titolo="Note">
          <div className="grid gap-5 md:grid-cols-2">
            <Campo etichetta="Come ci ha conosciuti" id="c-fonte" value={d.fonte} onChange={set("fonte")} placeholder="Passaparola, sito, bando…" />
            <div className="md:col-span-2">
              <AreaTesto etichetta="Note" id="c-note" value={d.note} onChange={set("note")} />
            </div>
          </div>
        </SezioneModulo>

        {!id ? <p className="text-sm text-tenue">I referenti (RUP, amministratore, ufficio tecnico…) si aggiungono dalla scheda, dopo il salvataggio.</p> : null}

        {doppioni?.length ? (
          <div role="alert" className="rounded-medio border border-[color:var(--stato-preventivo)]/40 bg-[color:var(--stato-preventivo)]/8 p-4">
            <p className="text-[0.9375rem] font-medium">Potrebbe essere già in archivio</p>
            <ul className="mt-2 flex flex-col gap-1 text-[0.9375rem]">
              {doppioni.map((x) => (
                <li key={x.id}>
                  <Link href={`/clienti/${x.id}`} className="text-accento hover:underline">
                    {x.nome}
                  </Link>
                  <span className="text-tenue">
                    {x.comune ? ` · ${x.comune}` : ""} · {x.motivo}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => salva(true)} disabled={inCorso} className={classePillola}>
                Salva comunque
              </button>
              <button type="button" onClick={() => setDoppioni(null)} className={classePillola}>
                Rivedi i dati
              </button>
            </div>
          </div>
        ) : null}

        {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}

        <div className="flex flex-wrap gap-2 border-t border-linea pt-5">
          <button type="submit" disabled={inCorso || !!doppioni?.length} className={cn(classePillola, "border-inchiostro bg-inchiostro text-superficie hover:bg-inchiostro/90")}>
            {inCorso ? "Salvataggio…" : id ? "Salva modifiche" : "Salva cliente"}
          </button>
          <button type="button" onClick={annulla} disabled={inCorso} className={classePillola}>
            Annulla
          </button>
        </div>
      </div>
    </form>
  );
}
