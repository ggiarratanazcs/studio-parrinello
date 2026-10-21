"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Mail, MapPin, Pencil, Phone, Plus, ShieldCheck, Star, Trash2, User, WandSparkles } from "lucide-react";
import { Campo, AreaTesto, Messaggio, Segmenti, Selezione } from "@/components/campo";
import { SceltaLocalita } from "@/components/procedura/scelta-localita";
import { classePillola } from "@/components/anagrafiche/carta";
import { Chiudi, DatoCopiabile, GruppoPratiche, Indietro, SchedeSezioni, TitoloColonna, classeAzione } from "@/components/anagrafiche/parti";
import { useInFinestra } from "@/components/anagrafiche/finestra-anagrafica";
import { TIPI_CLIENTE } from "@/lib/dominio";
import { cn, formattaEuro } from "@/lib/utils";
import {
  cercaDoppioniCliente,
  cercaEntiPA,
  datiDaPartitaIva,
  ufficiFatturazionePA,
  type EnteIPA,
  type UfficioIPA,
  eliminaReferente,
  salvaCliente,
  salvaReferente,
  type DatiCliente,
  type DatiReferente,
  type PossibileDoppione,
} from "@/lib/azioni-anagrafiche";
import type { AnalisiCliente, Cliente, ImmobileCliente, Referente, SchedaClienteDati } from "@/lib/anagrafiche";

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

/** Icona del tipo di cliente, a tratto, senza contenitore: persona, edificio, edificio della PA. */
function IconaTipo({ tipo }: { tipo: string }) {
  const Icona = tipo === "persona_fisica" ? User : Building2;
  return (
    <span aria-hidden className="relative inline-flex shrink-0 text-inchiostro">
      <Icona className="size-8" strokeWidth={1.3} />
      {tipo === "ente_pubblico" ? (
        <span className="absolute -right-3.5 -top-1.5 text-[0.625rem] font-semibold leading-none tracking-[0.06em] text-inchiostro">PA</span>
      ) : null}
    </span>
  );
}



export function SchedaCliente({ scheda }: { scheda: SchedaClienteDati | null }) {
  const [modifica, setModifica] = useState(!scheda);
  return (
    <div className="scheda-profilo">
      {modifica ? (
        <div className="carta-chiara h-full overflow-hidden">
          <ModuloCliente scheda={scheda} onFatto={() => setModifica(false)} />
        </div>
      ) : scheda ? (
        <VistaCliente scheda={scheda} onModifica={() => setModifica(true)} />
      ) : null}
    </div>
  );
}

/* ── Lettura ──────────────────────────────────────────────────────────── */

function VistaCliente({ scheda, onModifica }: { scheda: SchedaClienteDati; onModifica: () => void }) {
  const { cliente: c, referenti } = scheda;
  const [vista, setVista] = useState<"pratiche" | "immobili" | "analisi">("pratiche");
  const ente = c.tipo === "ente_pubblico";
  const localita = [c.cap, c.comune, c.provincia ? `(${c.provincia})` : null].filter(Boolean).join(" ");
  const sede = [c.indirizzo, localita].filter(Boolean).join(", ");
  const scrivi = c.pec ?? c.email;
  const totale = scheda.prefattibilita.length + scheda.preventivi.length + scheda.commesse.length;
  // Tutti i campi, anche quelli non compilati (mostrati con un trattino)
  const codici: [string, string | null][] = [
    ...(c.tipo !== "persona_fisica" ? ([["Partita IVA", c.partita_iva]] as [string, string | null][]) : []),
    ["Cod. fiscale", c.codice_fiscale],
    [ente ? "Codice IPA" : "Codice SDI", ente ? c.codice_ipa : c.codice_sdi],
  ];
  const contatti: [string, string | null, typeof Mail][] = [
    ["PEC", c.pec, ShieldCheck],
    ["Email", c.email, Mail],
    ["Telefono", c.telefono, Phone],
    ["Sede", sede || null, MapPin],
  ];
  const azione = classeAzione;

  return (
    <div className="grid gap-4 lg:h-full lg:grid-cols-[21.5rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
      {/* ── Carta dell'identità: chi è il cliente ── */}
      <aside className="carta-chiara senza-barra px-6 py-6 lg:overflow-y-auto">
        <Indietro />
        <div className="flex items-center justify-between gap-3">
          <span className="etichetta-anagrafica">Anagrafica · Cliente</span>
          <span className="lg:hidden">
            <Chiudi elenco="/clienti" nomeElenco="clienti" />
          </span>
        </div>

        <div className={cn("mt-5 flex items-center", ente ? "gap-5" : "gap-3.5")}>
          <IconaTipo tipo={c.tipo} />
          <div className="min-w-0">
            <h1 className="titolo-display text-[1.375rem] leading-[1.15] text-inchiostro">{c.denominazione ?? "Senza nome"}</h1>
            <p className="mt-0.5 text-[0.875rem] text-inchiostro-2">{TIPI_CLIENTE[c.tipo] ?? c.tipo}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {scrivi ? (
            <a href={`mailto:${scrivi}`} className={azione} aria-label={`Scrivi a ${scrivi}`} data-suggerimento={c.pec ? "Scrivi alla PEC" : "Scrivi"} data-suggerimento-lato="sotto">
              <Mail className="size-[18px]" strokeWidth={1.7} />
            </a>
          ) : (
            <span className={cn(azione, "pointer-events-none opacity-35")} aria-hidden><Mail className="size-[18px]" strokeWidth={1.7} /></span>
          )}
          {c.telefono ? (
            <a href={`tel:${c.telefono.replace(/\s+/g, "")}`} className={azione} aria-label={`Chiama ${c.telefono}`} data-suggerimento="Chiama" data-suggerimento-lato="sotto">
              <Phone className="size-[18px]" strokeWidth={1.7} />
            </a>
          ) : (
            <span className={cn(azione, "pointer-events-none opacity-35")} aria-hidden><Phone className="size-[18px]" strokeWidth={1.7} /></span>
          )}
          {sede ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sede)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={azione}
              aria-label="Apri la sede sulla mappa"
              data-suggerimento="Sede sulla mappa"
              data-suggerimento-lato="sotto"
            >
              <MapPin className="size-[18px]" strokeWidth={1.7} />
            </a>
          ) : (
            <span className={cn(azione, "pointer-events-none opacity-35")} aria-hidden><MapPin className="size-[18px]" strokeWidth={1.7} /></span>
          )}
          <button type="button" onClick={onModifica} className="grid h-10 place-items-center rounded-[10px] bg-inchiostro text-superficie transition-opacity hover:opacity-90" aria-label="Modifica" data-suggerimento="Modifica" data-suggerimento-lato="sotto">
            <Pencil className="size-[18px]" strokeWidth={1.7} />
          </button>
        </div>

        {/* Solo i dati compilati: quelli mancanti si aggiungono da Modifica */}
        {codici.length ? (
          <dl className="mt-5 flex flex-col gap-1 border-b border-linea pb-4">
            {codici.map(([voce, valore]) => (
              <DatoCopiabile key={voce} voce={voce} valore={valore} codice riga />
            ))}
          </dl>
        ) : null}
        {contatti.length ? (
          <dl className={cn("flex flex-col gap-2", codici.length ? "mt-4" : "mt-5")}>
            {contatti.map(([voce, valore, icona]) => (
              <DatoCopiabile key={voce} voce={voce} valore={valore} icona={icona} />
            ))}
          </dl>
        ) : null}


        <Referenti clienteId={c.id} referenti={referenti} ente={ente} />

        {c.fonte || c.note ? (
          <div className="mt-6">
            <TitoloColonna>Note</TitoloColonna>
            {c.fonte ? <p className="text-[0.875rem] text-inchiostro-2">Ci ha conosciuti: {c.fonte}</p> : null}
            {c.note ? <p className="mt-1.5 line-clamp-2 text-[0.875rem] text-inchiostro-2" title={c.note}>{c.note}</p> : null}
          </div>
        ) : null}
      </aside>

      {/* ── Carta chiara: pratiche, immobili, analisi ── */}
      <section className="carta-chiara flex min-w-0 flex-col lg:min-h-0">
        <SchedeSezioni
          sezioni={[
            ["pratiche", "Pratiche", totale],
            ["immobili", "Immobili", scheda.immobili.length],
            ["analisi", "Analisi", null],
          ] as const}
          scelta={vista}
          onScegli={setVista}
          chiudi={<Chiudi elenco="/clienti" nomeElenco="clienti" />}
        />

        <div className="min-h-0 flex-1 px-6 pb-7 pt-5 lg:overflow-y-auto lg:px-8">
          {vista === "pratiche" ? (
            <div className="flex flex-col gap-2.5">
              <GruppoPratiche titolo="Pre-fattibilità" colore="var(--stato-prefattibilita)" pratiche={scheda.prefattibilita} vuoto="Nessuna pre-fattibilità per questo cliente." importo="Onorario" />
              <GruppoPratiche titolo="Preventivi" colore="var(--stato-preventivo)" pratiche={scheda.preventivi} vuoto="Nessun preventivo per questo cliente." importo="Imponibile" />
              <GruppoPratiche titolo="Commesse" colore="var(--stato-attiva)" pratiche={scheda.commesse} vuoto="Nessuna commessa per questo cliente." importo="Onorario" />
            </div>
          ) : vista === "immobili" ? (
            <ImmobiliCliente immobili={scheda.immobili} />
          ) : (
            <Analisi a={scheda.analisi} />
          )}
        </div>
      </section>
    </div>
  );
}




/* ── Immobili ─────────────────────────────────────────────────────────── */

function ImmobiliCliente({ immobili }: { immobili: ImmobileCliente[] }) {
  if (!immobili.length) {
    return (
      <p className="text-[0.9375rem] text-inchiostro-2">
        Nessun immobile collegato: gli immobili compaiono qui quando una pre-fattibilità, un preventivo o una commessa del cliente ne indica uno.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {immobili.map((i) => (
        <li key={i.id}>
          <Link href={`/immobili/${i.id}?da=cliente`} className="flex items-center gap-3.5 rounded-[12px] bg-superficie-2/80 px-4 py-3.5 transition-colors hover:bg-superficie-2">
          <Building2 aria-hidden className="size-6 shrink-0 text-inchiostro-2" strokeWidth={1.4} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-medium text-inchiostro">{i.nome}</p>
            <p className="truncate text-[0.8125rem] text-inchiostro-2">{i.indirizzo}</p>
          </div>
          <span className="numeri shrink-0 text-[0.8125rem] text-inchiostro-2">
            {i.pratiche.length} {i.pratiche.length === 1 ? "pratica" : "pratiche"}
          </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ── Analisi ──────────────────────────────────────────────────────────── */

const percento = new Intl.NumberFormat("it-IT", { style: "percent", maximumFractionDigits: 0 });

function Analisi({ a }: { a: AnalisiCliente }) {
  const chiusi = a.preventiviAccettati + a.preventiviRifiutati;
  const tasso = chiusi ? a.preventiviAccettati / chiusi : null;
  const barra = a.preventiviEmessi || 1;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
    <div className={cn("rounded-[14px] px-4 py-4", evidenza ? "bg-inchiostro text-[color:var(--fondo-carta)] [&_p]:!text-current" : "bg-superficie-2/80")}>
      <p className="text-[0.75rem] text-inchiostro-2">{voce}</p>
      <p className="numeri mt-1.5 text-[1.5rem] font-medium leading-none text-inchiostro" style={{ fontVariationSettings: '"wdth" 108' }}>
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
    <div className="mt-6">
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
      <ul className="flex flex-col gap-0.5">
        {referenti.map((r) =>
          aperto === r.id ? (
            <li key={r.id}>{modulo}</li>
          ) : (
            <li key={r.id} className="group -mx-2 flex items-start gap-2 rounded-medio px-2 py-1.5 hover:bg-superficie-2/60">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[0.875rem]">
                  <span className="truncate font-medium">{r.nome}</span>
                  {r.ruolo ? <span className="truncate text-inchiostro-2">· {r.ruolo}</span> : null}
                  {r.principale ? <Star aria-label="Referente principale" className="size-3 shrink-0 fill-current text-[color:var(--stato-preventivo)]" strokeWidth={1.5} /> : null}
                </p>
                <p className="flex flex-wrap gap-x-2.5 text-[0.8125rem] text-inchiostro-2" title={r.note ?? undefined}>
                  {r.email ? <a href={`mailto:${r.email}`} className="truncate hover:text-accento">{r.email}</a> : null}
                  {r.telefono ? <a href={`tel:${r.telefono.replace(/\s+/g, "")}`} className="numeri hover:text-accento">{r.telefono}</a> : null}
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

/* ── Ricerca IndicePA (enti pubblici) ─────────────────────────────────── */

function RicercaIndicePA({ onScelto, onUfficio }: { onScelto: (e: EnteIPA) => void; onUfficio: (codice: string) => void }) {
  const [testo, setTesto] = useState("");
  const [enti, setEnti] = useState<EnteIPA[] | null>(null);
  const [scelto, setScelto] = useState<EnteIPA | null>(null);
  const [uffici, setUffici] = useState<UfficioIPA[] | null>(null);
  const [ufficio, setUfficio] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [cerca, avviaCerca] = useTransition();
  const [caricaUffici, avviaUffici] = useTransition();
  const ultima = useRef(0);

  function cambia(v: string) {
    setTesto(v);
    setErrore(null);
    const numero = ++ultima.current;
    if (v.trim().length < 3) return setEnti(null);
    // Attende una breve pausa nella digitazione prima di cercare
    setTimeout(() => {
      if (numero !== ultima.current) return;
      avviaCerca(async () => {
        const r = await cercaEntiPA(v);
        if (numero !== ultima.current) return;
        if (!r.ok) return setErrore(r.errore);
        setEnti(r.enti);
      });
    }, 350);
  }

  function scegli(e: EnteIPA) {
    setScelto(e);
    setEnti(null);
    setTesto("");
    setUffici(null);
    setUfficio("");
    onScelto(e);
    avviaUffici(async () => {
      const r = await ufficiFatturazionePA(e.codiceIPA);
      if (!r.ok) return setErrore(r.errore);
      setUffici(r.uffici);
      // Con un solo ufficio di fatturazione il codice si compila da solo
      if (r.uffici.length === 1) {
        setUfficio(r.uffici[0].codice);
        onUfficio(r.uffici[0].codice);
      }
    });
  }

  return (
    <div className="rounded-[14px] bg-superficie-2/70 p-4">
      <div className="relative">
        <Campo
          etichetta="Cerca l'ente in IndicePA"
          id="c-ipa-cerca"
          value={testo}
          onChange={(e) => cambia(e.target.value)}
          placeholder="Comune di Noto, oppure il codice fiscale"
          autoComplete="off"
          aiuto="Indice delle Pubbliche Amministrazioni (AgID): compila denominazione, codice fiscale, sede e PEC."
        />
        {cerca ? <Loader2 aria-hidden className="absolute right-3 top-[2.45rem] size-4 animate-spin text-tenue" /> : null}
        {enti ? (
          <ul role="listbox" className="absolute inset-x-0 top-[4.6rem] z-10 max-h-72 overflow-y-auto rounded-medio border border-linea bg-superficie p-1 shadow-[0_18px_40px_-18px_rgba(20,30,50,0.45)]">
            {enti.length === 0 ? <li className="px-3 py-2.5 text-sm text-tenue">Nessun ente trovato.</li> : null}
            {enti.map((e) => (
              <li key={e.codiceIPA}>
                <button type="button" role="option" aria-selected={false} onClick={() => scegli(e)} className="w-full rounded-piccolo px-3 py-2 text-left hover:bg-superficie-2">
                  <span className="block text-[0.9375rem] text-inchiostro">{e.denominazione}</span>
                  <span className="block text-[0.8125rem] text-inchiostro-2">{[e.comune && `${e.comune}${e.provincia ? ` (${e.provincia})` : ""}`, `CF ${e.codiceFiscale}`].filter(Boolean).join(" · ")}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {scelto ? (
        <div className="mt-4">
          <p className="text-[0.875rem] text-inchiostro-2">
            Dati compilati da IndicePA per <span className="font-medium text-inchiostro">{scelto.denominazione}</span>. Scegli l&apos;ufficio a cui intestare le fatture:
          </p>
          {caricaUffici ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-tenue">
              <Loader2 aria-hidden className="size-4 animate-spin" /> Carico gli uffici di fatturazione…
            </p>
          ) : uffici?.length ? (
            <div className="mt-2">
              <Selezione
                etichetta="Ufficio di fatturazione"
                id="c-ipa-ufficio"
                value={ufficio}
                onChange={(e) => {
                  setUfficio(e.target.value);
                  onUfficio(e.target.value);
                }}
              >
                <option value="">Scegli l&apos;ufficio…</option>
                {uffici.map((u) => (
                  <option key={u.codice} value={u.codice}>
                    {u.descrizione} — {u.codice}
                  </option>
                ))}
              </Selezione>
            </div>
          ) : uffici ? (
            <p className="mt-2 text-sm text-tenue">L&apos;ente non ha uffici di fatturazione registrati: inserisci il codice univoco a mano.</p>
          ) : null}
        </div>
      ) : null}
      {errore ? (
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
  const [vies, setVies] = useState<{ ok: boolean; testo: string } | null>(null);
  const [cercaVies, avviaVies] = useTransition();

  function compilaDaVies() {
    setVies(null);
    avviaVies(async () => {
      const r = await datiDaPartitaIva(d.partita_iva);
      if (!r.ok) return setVies({ ok: false, testo: r.errore });
      setD((prima) => ({
        ...prima,
        ragione_sociale: r.ragione_sociale || prima.ragione_sociale,
        indirizzo: r.indirizzo || prima.indirizzo,
        cap: r.cap || prima.cap,
        comune: r.comune || prima.comune,
        provincia: r.provincia || prima.provincia,
      }));
      setDoppioni(null);
      setVies({
        ok: true,
        testo: `Trovata: ${[r.ragione_sociale, r.comune].filter(Boolean).join(", ")}. Controlla i dati e aggiungi PEC e codice SDI, che VIES non fornisce.`,
      });
    });
  }

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
      className="h-full px-5 py-6 md:px-8 md:py-7 lg:overflow-y-auto"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-tenue">{id ? "Modifica cliente" : "Nuovo cliente"}</p>
          <h1 className="titolo-display mt-1 text-[1.5rem] leading-tight md:text-[1.875rem]">
            {(privato ? [d.cognome, d.nome].filter(Boolean).join(" ") : d.ragione_sociale) || (id ? "Cliente" : "Nuovo cliente")}
          </h1>
        </div>
        <Chiudi elenco="/clienti" nomeElenco="clienti" />
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
              <>
              {ente ? (
                <div className="md:col-span-2">
                  <RicercaIndicePA
                    onScelto={(e) => {
                      setD((prima) => ({
                        ...prima,
                        ragione_sociale: e.denominazione || prima.ragione_sociale,
                        codice_fiscale: e.codiceFiscale || prima.codice_fiscale,
                        indirizzo: e.indirizzo || prima.indirizzo,
                        cap: e.cap || prima.cap,
                        comune: e.comune || prima.comune,
                        provincia: e.provincia || prima.provincia,
                        pec: e.pec || prima.pec,
                      }));
                      setErrori({});
                      setDoppioni(null);
                    }}
                    onUfficio={(codice) => setD((prima) => ({ ...prima, codice_ipa: codice }))}
                  />
                </div>
              ) : (
              <>
              {/* Aziende: partita IVA per prima, da qui si compilano gli altri dati (VIES, gratuito) */}
              <div className="md:col-span-2">
                <div className="flex items-end gap-2">
                  <div className="w-full sm:w-64">
                    <Campo
                      etichetta="Partita IVA"
                      id="c-piva"
                      value={d.partita_iva}
                      onChange={(e) => {
                        set("partita_iva")(e);
                        setVies(null);
                      }}
                      inputMode="numeric"
                      autoComplete="off"
                      autoFocus={!id}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={compilaDaVies}
                    disabled={cercaVies || d.partita_iva.replace(/\s+/g, "").replace(/^IT/i, "").length !== 11}
                    className={cn(classeAzione, "size-11 h-11 shrink-0 disabled:cursor-not-allowed disabled:opacity-40")}
                    aria-label="Compila dalla partita IVA"
                    data-suggerimento="Compila dalla partita IVA (VIES)"
                    data-suggerimento-lato="sotto"
                  >
                    {cercaVies ? <Loader2 className="size-[18px] animate-spin" strokeWidth={1.8} /> : <WandSparkles className="size-[18px]" strokeWidth={1.7} />}
                  </button>
                </div>
                {vies ? (
                  <div className="mt-2">
                    <Messaggio tipo={vies.ok ? "ok" : "errore"}>{vies.testo}</Messaggio>
                  </div>
                ) : null}
              </div>
              </>
              )}
              <div className="md:col-span-2">
                <Campo
                  etichetta={ente ? "Denominazione dell'ente" : "Ragione sociale"}
                  id="c-rs"
                  obbligatorio
                  value={d.ragione_sociale}
                  onChange={set("ragione_sociale")}
                  errore={errori.ragione_sociale}
                  placeholder={ente ? "Comune di Noto" : "Rossi Immobiliare S.r.l."}
                />
              </div>
              </>
            )}
          </div>
        </SezioneModulo>

        <SezioneModulo titolo="Dati fiscali">
          <div className="grid gap-5 md:grid-cols-2">
            {ente ? <Campo etichetta="Partita IVA" id="c-piva" value={d.partita_iva} onChange={set("partita_iva")} inputMode="numeric" autoComplete="off" /> : null}
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
