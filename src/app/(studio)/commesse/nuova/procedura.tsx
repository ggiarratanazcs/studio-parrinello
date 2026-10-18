"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";
import { AreaTesto, Campo, Messaggio, Segmenti, Selezione } from "@/components/campo";
import { Pannello, Pulsante } from "@/components/ui";
import { AMBITI, STATI_COMMESSA, TIPI_CLIENTE, TIPOLOGIE_INTERVENTO } from "@/lib/dominio";
import { propostaFasi } from "@/lib/fasi";
import type { DatiNuovaCommessa } from "@/lib/dati";
import { cn } from "@/lib/utils";
import { creaCommessa } from "../azioni";

/* ──────────────────────────────────────────────────────────────────────────
   Tipi e valori iniziali
   ────────────────────────────────────────────────────────────────────────── */

type TipoCliente = "persona_fisica" | "azienda" | "ente_pubblico";
type Committenza = "privata" | "pubblica";

const PASSI = ["Committente", "Immobile", "Incarico", "Fasi"] as const;

const STATI_INIZIALI = ["contatto", "prefattibilita", "preventivo", "attiva"] as const;

const clienteVuoto = {
  tipo: "persona_fisica" as TipoCliente,
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
  comune: "",
  provincia: "",
};

const immobileVuoto = {
  denominazione: "",
  indirizzo: "",
  cap: "",
  comune: "",
  provincia: "",
  zona_urbanistica: "",
  catasto: { catasto: "fabbricati", foglio: "", particella: "", subalterno: "", categoria: "" },
};

/* ──────────────────────────────────────────────────────────────────────────
   Procedura
   ────────────────────────────────────────────────────────────────────────── */

export function ProceduraNuovaCommessa({ dati, oggi }: { dati: DatiNuovaCommessa; oggi: string }) {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [errori, setErrori] = useState<Record<string, string>>({});
  const [erroreInvio, setErroreInvio] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  // Passo 1 — committente
  const [modoCliente, setModoCliente] = useState<"esistente" | "nuovo">(dati.clienti.length ? "esistente" : "nuovo");
  const [clienteId, setClienteId] = useState("");
  const [cercaCliente, setCercaCliente] = useState("");
  const [cliente, setCliente] = useState(clienteVuoto);

  // Passo 2 — immobile
  const [modoImmobile, setModoImmobile] = useState<"esistente" | "nuovo" | "nessuno">(
    dati.immobili.length ? "esistente" : "nuovo",
  );
  const [immobileId, setImmobileId] = useState("");
  const [cercaImmobile, setCercaImmobile] = useState("");
  const [immobile, setImmobile] = useState(immobileVuoto);

  // Passo 3 — incarico
  const [incarico, setIncarico] = useState({
    titolo: "",
    committenza: "privata" as Committenza,
    tipologia_intervento: "",
    ambito: "",
    stato: "contatto",
    responsabile_id: "",
    data_apertura: oggi,
    data_fine_prevista: "",
    importo_lavori_stimato: "",
    descrizione: "",
    cig: "",
    cup: "",
    rup_nome: "",
  });
  const [committenzaToccata, setCommittenzaToccata] = useState(false);

  // Passo 4 — fasi
  const [fasiScelte, setFasiScelte] = useState<string[] | null>(null); // null = segui la proposta

  /* ── Valori derivati ── */
  const clienteScelto = dati.clienti.find((c) => c.id === clienteId);
  const immobileScelto = dati.immobili.find((i) => i.id === immobileId);
  const tipoCommittente: TipoCliente | undefined =
    modoCliente === "nuovo" ? cliente.tipo : (clienteScelto?.tipo as TipoCliente | undefined);

  const committenza: Committenza = committenzaToccata
    ? incarico.committenza
    : tipoCommittente === "ente_pubblico"
      ? "pubblica"
      : "privata";

  const proposta = useMemo(
    () => propostaFasi(committenza, incarico.tipologia_intervento || null),
    [committenza, incarico.tipologia_intervento],
  );
  const codiciFasi = fasiScelte ?? proposta;

  const nomeCommittente =
    modoCliente === "esistente"
      ? clienteScelto?.denominazione
      : cliente.tipo === "persona_fisica"
        ? [cliente.cognome, cliente.nome].filter(Boolean).join(" ")
        : cliente.ragione_sociale;

  const descrizioneImmobile =
    modoImmobile === "nessuno"
      ? "Da definire"
      : modoImmobile === "esistente"
        ? immobileScelto && (immobileScelto.denominazione ?? `${immobileScelto.indirizzo}, ${immobileScelto.comune}`)
        : [immobile.denominazione || immobile.indirizzo, immobile.comune].filter(Boolean).join(", ");

  const clientiFiltrati = filtra(dati.clienti, cercaCliente, (c) => `${c.denominazione} ${c.comune ?? ""}`);
  const immobiliFiltrati = filtra(
    dati.immobili,
    cercaImmobile,
    (i) => `${i.denominazione ?? ""} ${i.indirizzo} ${i.comune}`,
  );

  /* ── Validazione per passo ── */
  function valida(p: number) {
    const e: Record<string, string> = {};
    if (p === 0) {
      if (modoCliente === "esistente" && !clienteId) e.cliente = "Scegli un committente dall'elenco, oppure creane uno nuovo.";
      if (modoCliente === "nuovo") {
        if (cliente.tipo === "persona_fisica" && !cliente.cognome.trim()) e.cognome = "Inserisci il cognome.";
        if (cliente.tipo !== "persona_fisica" && !cliente.ragione_sociale.trim())
          e.ragione_sociale = cliente.tipo === "ente_pubblico" ? "Inserisci la denominazione dell'ente." : "Inserisci la ragione sociale.";
      }
    }
    if (p === 1) {
      if (modoImmobile === "esistente" && !immobileId) e.immobile = "Scegli un immobile dall'elenco, creane uno nuovo o indica che è da definire.";
      if (modoImmobile === "nuovo") {
        if (!immobile.indirizzo.trim()) e.indirizzo = "Inserisci l'indirizzo.";
        if (!immobile.comune.trim()) e.comune_immobile = "Inserisci il comune.";
      }
    }
    if (p === 2) {
      if (!incarico.titolo.trim()) e.titolo = "Dai un titolo alla commessa, per esempio \"Ristrutturazione Villa M\".";
    }
    setErrori(e);
    return Object.keys(e).length === 0;
  }

  function avanti() {
    if (!valida(passo)) return;
    setPasso((p) => Math.min(p + 1, PASSI.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function vaiA(p: number) {
    if (p < passo) {
      setErrori({});
      setPasso(p);
    }
  }

  function salva() {
    for (let p = 0; p < PASSI.length; p++) {
      if (!valida(p)) {
        setPasso(p);
        return;
      }
    }
    const fasi = dati.fasi
      .filter((f) => codiciFasi.includes(f.codice))
      .map((f) => ({ fase_catalogo_id: f.id, codice: f.codice, nome: f.nome }));

    const payload = {
      cliente_id: modoCliente === "esistente" ? clienteId : null,
      cliente: modoCliente === "nuovo" ? cliente : null,
      immobile_id: modoImmobile === "esistente" ? immobileId : null,
      immobile: modoImmobile === "nuovo" ? immobile : null,
      commessa: { ...incarico, committenza },
      fasi,
    };

    setErroreInvio(null);
    avvia(async () => {
      const esito = await creaCommessa(payload);
      if (esito.ok) {
        router.push(`/commesse/${esito.id}`);
      } else {
        setErroreInvio(esito.errore);
      }
    });
  }

  /* ── Rendering ── */
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
      <div className="min-w-0">
        <Passi corrente={passo} onVai={vaiA} />

        <Pannello className="mt-6 p-5 md:p-7">
          {passo === 0 ? (
            <section aria-labelledby="t-passo" className="flex flex-col gap-5">
              <TitoloPasso testo="Chi è il committente?" />
              <Segmenti
                etichetta="Committente"
                valore={modoCliente}
                opzioni={[
                  { valore: "esistente", etichetta: "Già in archivio" },
                  { valore: "nuovo", etichetta: "Nuovo committente" },
                ]}
                onCambia={(v) => {
                  setModoCliente(v);
                  setErrori({});
                }}
              />

              {modoCliente === "esistente" ? (
                <SceltaDaElenco
                  cerca={cercaCliente}
                  onCerca={setCercaCliente}
                  segnaposto="Cerca per nome o comune"
                  vuoto={dati.clienti.length === 0 ? "L'archivio clienti è vuoto: crea il primo committente." : "Nessun committente corrisponde alla ricerca."}
                  errore={errori.cliente}
                  voci={clientiFiltrati.map((c) => ({
                    id: c.id,
                    titolo: c.denominazione ?? "",
                    dettaglio: [TIPI_CLIENTE[c.tipo], c.comune].filter(Boolean).join(", "),
                  }))}
                  scelto={clienteId}
                  onScegli={setClienteId}
                />
              ) : (
                <FormCliente valore={cliente} onCambia={setCliente} errori={errori} />
              )}
            </section>
          ) : null}

          {passo === 1 ? (
            <section aria-labelledby="t-passo" className="flex flex-col gap-5">
              <TitoloPasso testo="Su quale immobile si interviene?" />
              <Segmenti
                etichetta="Immobile"
                valore={modoImmobile}
                opzioni={[
                  { valore: "esistente", etichetta: "Già in archivio" },
                  { valore: "nuovo", etichetta: "Nuovo immobile" },
                  { valore: "nessuno", etichetta: "Da definire" },
                ]}
                onCambia={(v) => {
                  setModoImmobile(v);
                  setErrori({});
                }}
              />
              {modoImmobile === "esistente" ? (
                <SceltaDaElenco
                  cerca={cercaImmobile}
                  onCerca={setCercaImmobile}
                  segnaposto="Cerca per indirizzo, nome o comune"
                  vuoto={dati.immobili.length === 0 ? "Nessun immobile in archivio: inseriscine uno nuovo." : "Nessun immobile corrisponde alla ricerca."}
                  errore={errori.immobile}
                  voci={immobiliFiltrati.map((i) => ({
                    id: i.id,
                    titolo: i.denominazione ?? i.indirizzo,
                    dettaglio: i.denominazione ? `${i.indirizzo}, ${i.comune}` : i.comune,
                  }))}
                  scelto={immobileId}
                  onScegli={setImmobileId}
                />
              ) : null}
              {modoImmobile === "nuovo" ? <FormImmobile valore={immobile} onCambia={setImmobile} errori={errori} /> : null}
              {modoImmobile === "nessuno" ? (
                <p className="text-[0.9375rem] text-tenue">
                  Va bene per un primo contatto. Potrai collegare l&apos;immobile dalla scheda della commessa.
                </p>
              ) : null}
            </section>
          ) : null}

          {passo === 2 ? (
            <section aria-labelledby="t-passo" className="flex flex-col gap-5">
              <TitoloPasso testo="L'incarico" />
              <Campo
                etichetta="Titolo della commessa"
                id="titolo"
                obbligatorio
                value={incarico.titolo}
                onChange={(e) => setIncarico({ ...incarico, titolo: e.target.value })}
                placeholder="Ristrutturazione Villa M"
                errore={errori.titolo}
              />
              <Segmenti
                etichetta="Committenza"
                valore={committenza}
                opzioni={[
                  { valore: "privata", etichetta: "Privata" },
                  { valore: "pubblica", etichetta: "Pubblica" },
                ]}
                onCambia={(v) => {
                  setCommittenzaToccata(true);
                  setIncarico({ ...incarico, committenza: v });
                }}
              />
              <div className="grid gap-5 md:grid-cols-2">
                <Selezione
                  etichetta="Tipologia di intervento"
                  id="tipologia"
                  value={incarico.tipologia_intervento}
                  onChange={(e) => setIncarico({ ...incarico, tipologia_intervento: e.target.value })}
                >
                  <option value="">Da definire</option>
                  {Object.entries(TIPOLOGIE_INTERVENTO).map(([v, e]) => (
                    <option key={v} value={v}>
                      {e}
                    </option>
                  ))}
                </Selezione>
                <Selezione
                  etichetta="Ambito"
                  id="ambito"
                  value={incarico.ambito}
                  onChange={(e) => setIncarico({ ...incarico, ambito: e.target.value })}
                >
                  <option value="">Da definire</option>
                  {Object.entries(AMBITI).map(([v, e]) => (
                    <option key={v} value={v}>
                      {e}
                    </option>
                  ))}
                </Selezione>
                <Selezione
                  etichetta="Stato iniziale"
                  id="stato"
                  value={incarico.stato}
                  onChange={(e) => setIncarico({ ...incarico, stato: e.target.value })}
                >
                  {STATI_INIZIALI.map((s) => (
                    <option key={s} value={s}>
                      {STATI_COMMESSA[s].etichetta}
                    </option>
                  ))}
                </Selezione>
                <Selezione
                  etichetta="Responsabile"
                  id="responsabile"
                  value={incarico.responsabile_id}
                  onChange={(e) => setIncarico({ ...incarico, responsabile_id: e.target.value })}
                >
                  <option value="">Da assegnare</option>
                  {dati.profili.map((p) => (
                    <option key={p.id} value={p.id}>
                      {[p.nome, p.cognome].filter(Boolean).join(" ") || p.email}
                    </option>
                  ))}
                </Selezione>
                <Campo
                  etichetta="Data di apertura"
                  id="apertura"
                  type="date"
                  value={incarico.data_apertura}
                  onChange={(e) => setIncarico({ ...incarico, data_apertura: e.target.value })}
                />
                <Campo
                  etichetta="Fine prevista"
                  id="fine"
                  type="date"
                  value={incarico.data_fine_prevista}
                  onChange={(e) => setIncarico({ ...incarico, data_fine_prevista: e.target.value })}
                />
                <Campo
                  etichetta="Importo lavori stimato (€)"
                  id="importo"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={incarico.importo_lavori_stimato}
                  onChange={(e) => setIncarico({ ...incarico, importo_lavori_stimato: e.target.value })}
                  aiuto="Facoltativo. Serve per i preventivi a percentuale."
                />
              </div>
              {committenza === "pubblica" ? (
                <div className="grid gap-5 border-t border-linea pt-5 md:grid-cols-3">
                  <Campo etichetta="CIG" id="cig" value={incarico.cig} onChange={(e) => setIncarico({ ...incarico, cig: e.target.value })} />
                  <Campo etichetta="CUP" id="cup" value={incarico.cup} onChange={(e) => setIncarico({ ...incarico, cup: e.target.value })} />
                  <Campo
                    etichetta="RUP"
                    id="rup"
                    value={incarico.rup_nome}
                    onChange={(e) => setIncarico({ ...incarico, rup_nome: e.target.value })}
                    placeholder="Nome e cognome"
                  />
                </div>
              ) : null}
              <AreaTesto
                etichetta="Descrizione"
                id="descrizione"
                value={incarico.descrizione}
                onChange={(e) => setIncarico({ ...incarico, descrizione: e.target.value })}
                placeholder="Cosa chiede il committente, vincoli noti, prime note dal sopralluogo"
              />
            </section>
          ) : null}

          {passo === 3 ? (
            <section aria-labelledby="t-passo" className="flex flex-col gap-5">
              <TitoloPasso testo="Le fasi della commessa" />
              <p className="text-[0.9375rem] text-tenue">
                Ti propongo le fasi tipiche per una commessa {committenza}
                {incarico.tipologia_intervento ? ` di ${TIPOLOGIE_INTERVENTO[incarico.tipologia_intervento].toLowerCase()}` : ""}.
                Togli o aggiungi quelle che servono: onorari e ore di ogni fase si definiscono nella scheda.
              </p>
              <ul className="grid gap-1 md:grid-cols-2">
                {dati.fasi
                  .filter((f) => f.ambito === "entrambi" || (committenza === "pubblica" ? f.ambito === "pubblico" : f.ambito === "privato") || codiciFasi.includes(f.codice))
                  .map((f) => {
                    const scelta = codiciFasi.includes(f.codice);
                    return (
                      <li key={f.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-m px-3 py-2.5 transition-colors",
                            scelta ? "bg-accento-tenue" : "hover:bg-superficie-2/60",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 size-4 accent-[color:var(--accento)]"
                            checked={scelta}
                            onChange={() =>
                              setFasiScelte(scelta ? codiciFasi.filter((c) => c !== f.codice) : [...codiciFasi, f.codice])
                            }
                          />
                          <span className="text-[0.9375rem] leading-snug">{f.nome}</span>
                        </label>
                      </li>
                    );
                  })}
              </ul>
              {fasiScelte !== null ? (
                <button type="button" onClick={() => setFasiScelte(null)} className="self-start text-sm text-accento hover:underline">
                  Torna alla proposta
                </button>
              ) : null}
              {erroreInvio ? <Messaggio tipo="errore">{erroreInvio}</Messaggio> : null}
            </section>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-linea pt-5">
            {passo > 0 ? (
              <Pulsante variante="discreto" type="button" onClick={() => vaiA(passo - 1)} disabled={inCorso}>
                Indietro
              </Pulsante>
            ) : (
              <span />
            )}
            {passo < PASSI.length - 1 ? (
              <Pulsante type="button" onClick={avanti}>
                Avanti
              </Pulsante>
            ) : (
              <Pulsante type="button" onClick={salva} disabled={inCorso}>
                {inCorso ? <Loader2 className="size-4 animate-spin" /> : null}
                Crea commessa
              </Pulsante>
            )}
          </div>
        </Pannello>
      </div>

      {/* Riepilogo: sempre visibile su schermi grandi */}
      <aside className="hidden lg:block">
        <Pannello className="sticky top-6 p-5">
          <h2 className="text-base font-medium">Riepilogo</h2>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <Riga etichetta="Committente" valore={nomeCommittente} />
            <Riga etichetta="Immobile" valore={descrizioneImmobile} />
            <Riga etichetta="Titolo" valore={incarico.titolo} />
            <Riga etichetta="Committenza" valore={committenza === "pubblica" ? "Pubblica" : "Privata"} />
            <Riga etichetta="Fasi" valore={`${codiciFasi.length} selezionate`} />
          </dl>
        </Pannello>
      </aside>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Sotto-componenti
   ────────────────────────────────────────────────────────────────────────── */

function filtra<T>(elenco: T[], testo: string, chiave: (x: T) => string) {
  const t = testo.trim().toLowerCase();
  return t ? elenco.filter((x) => chiave(x).toLowerCase().includes(t)) : elenco;
}

function TitoloPasso({ testo }: { testo: string }) {
  return (
    <h2 id="t-passo" className="text-xl font-medium" style={{ fontVariationSettings: '"wdth" 108' }}>
      {testo}
    </h2>
  );
}

function Passi({ corrente, onVai }: { corrente: number; onVai: (p: number) => void }) {
  return (
    <ol className="flex gap-2 overflow-x-auto" aria-label="Passi della procedura">
      {PASSI.map((nome, i) => {
        const fatto = i < corrente;
        const attivo = i === corrente;
        return (
          <li key={nome} className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onVai(i)}
              disabled={!fatto}
              aria-current={attivo ? "step" : undefined}
              className="group w-full text-left disabled:cursor-default"
            >
              <span
                className={cn(
                  "block h-1 rounded-full transition-colors",
                  attivo ? "bg-accento" : fatto ? "bg-inchiostro" : "bg-linea",
                )}
              />
              <span
                className={cn(
                  "mt-2 flex items-center gap-1.5 text-sm",
                  attivo ? "text-inchiostro" : "text-tenue",
                  fatto ? "group-hover:text-inchiostro" : "",
                )}
              >
                {fatto ? <Check className="size-3.5" strokeWidth={2.2} /> : <span className="numeri">{i + 1}</span>}
                <span className={attivo ? "truncate" : "hidden truncate sm:inline"}>{nome}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function SceltaDaElenco({
  cerca,
  onCerca,
  segnaposto,
  vuoto,
  errore,
  voci,
  scelto,
  onScegli,
}: {
  cerca: string;
  onCerca: (v: string) => void;
  segnaposto: string;
  vuoto: string;
  errore?: string;
  voci: { id: string; titolo: string; dettaglio: string }[];
  scelto: string;
  onScegli: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tenue" />
        <input
          type="search"
          value={cerca}
          onChange={(e) => onCerca(e.target.value)}
          placeholder={segnaposto}
          aria-label={segnaposto}
          className="h-11 w-full rounded-m border border-linea-forte bg-superficie pl-9 pr-3 text-base outline-none focus:border-accento focus:ring-2 focus:ring-accento/20"
        />
      </div>
      {voci.length === 0 ? (
        <p className="text-[0.9375rem] text-tenue">{vuoto}</p>
      ) : (
        <ul role="radiogroup" className="max-h-72 divide-y divide-linea overflow-y-auto rounded-m border border-linea">
          {voci.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                role="radio"
                aria-checked={v.id === scelto}
                onClick={() => onScegli(v.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
                  v.id === scelto ? "bg-accento-tenue" : "hover:bg-superficie-2/60",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{v.titolo}</span>
                  <span className="block truncate text-sm text-tenue">{v.dettaglio}</span>
                </span>
                {v.id === scelto ? <Check className="size-4 shrink-0 text-accento" strokeWidth={2.2} /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
    </div>
  );
}

function FormCliente({
  valore: c,
  onCambia,
  errori,
}: {
  valore: typeof clienteVuoto;
  onCambia: (v: typeof clienteVuoto) => void;
  errori: Record<string, string>;
}) {
  const set = (campo: keyof typeof clienteVuoto) => (e: { target: { value: string } }) =>
    onCambia({ ...c, [campo]: e.target.value });
  return (
    <div className="flex flex-col gap-5">
      <Segmenti
        etichetta="Tipo"
        valore={c.tipo}
        opzioni={[
          { valore: "persona_fisica", etichetta: "Privato" },
          { valore: "azienda", etichetta: "Azienda" },
          { valore: "ente_pubblico", etichetta: "Ente pubblico" },
        ]}
        onCambia={(tipo) => onCambia({ ...c, tipo })}
      />
      <div className="grid gap-5 md:grid-cols-2">
        {c.tipo === "persona_fisica" ? (
          <>
            <Campo etichetta="Nome" id="c-nome" value={c.nome} onChange={set("nome")} autoComplete="off" />
            <Campo etichetta="Cognome" id="c-cognome" obbligatorio value={c.cognome} onChange={set("cognome")} errore={errori.cognome} autoComplete="off" />
            <Campo etichetta="Codice fiscale" id="c-cf" value={c.codice_fiscale} onChange={set("codice_fiscale")} className="uppercase" />
          </>
        ) : (
          <>
            <div className="md:col-span-2">
              <Campo
                etichetta={c.tipo === "ente_pubblico" ? "Denominazione dell'ente" : "Ragione sociale"}
                id="c-rs"
                obbligatorio
                value={c.ragione_sociale}
                onChange={set("ragione_sociale")}
                errore={errori.ragione_sociale}
                placeholder={c.tipo === "ente_pubblico" ? "Comune di Noto" : "Rossi Immobiliare S.r.l."}
              />
            </div>
            <Campo etichetta="Partita IVA" id="c-piva" value={c.partita_iva} onChange={set("partita_iva")} inputMode="numeric" />
            <Campo etichetta="Codice fiscale" id="c-cf" value={c.codice_fiscale} onChange={set("codice_fiscale")} className="uppercase" />
          </>
        )}
        {c.tipo === "ente_pubblico" ? (
          <Campo etichetta="Codice univoco ufficio (IPA)" id="c-ipa" value={c.codice_ipa} onChange={set("codice_ipa")} className="uppercase" />
        ) : (
          <Campo etichetta="Codice destinatario SDI" id="c-sdi" value={c.codice_sdi} onChange={set("codice_sdi")} className="uppercase" />
        )}
        <Campo etichetta="PEC" id="c-pec" type="email" value={c.pec} onChange={set("pec")} />
        <Campo etichetta="Email" id="c-email" type="email" value={c.email} onChange={set("email")} />
        <Campo etichetta="Telefono" id="c-tel" type="tel" value={c.telefono} onChange={set("telefono")} />
        <Campo etichetta="Comune" id="c-comune" value={c.comune} onChange={set("comune")} />
        <Campo etichetta="Provincia" id="c-prov" value={c.provincia} onChange={set("provincia")} maxLength={2} className="uppercase" placeholder="SR" />
      </div>
    </div>
  );
}

function FormImmobile({
  valore: i,
  onCambia,
  errori,
}: {
  valore: typeof immobileVuoto;
  onCambia: (v: typeof immobileVuoto) => void;
  errori: Record<string, string>;
}) {
  const set = (campo: Exclude<keyof typeof immobileVuoto, "catasto">) => (e: { target: { value: string } }) =>
    onCambia({ ...i, [campo]: e.target.value });
  const setCat = (campo: keyof typeof immobileVuoto.catasto) => (e: { target: { value: string } }) =>
    onCambia({ ...i, catasto: { ...i.catasto, [campo]: e.target.value } });
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Campo etichetta="Nome dell'immobile" id="i-nome" value={i.denominazione} onChange={set("denominazione")} placeholder="Villa M" aiuto="Facoltativo: il nome con cui lo chiamate in studio." />
        </div>
        <div className="md:col-span-2">
          <Campo etichetta="Indirizzo" id="i-ind" obbligatorio value={i.indirizzo} onChange={set("indirizzo")} errore={errori.indirizzo} placeholder="Via Temistocle 2" />
        </div>
        <Campo etichetta="Comune" id="i-comune" obbligatorio value={i.comune} onChange={set("comune")} errore={errori.comune_immobile} placeholder="Siracusa" />
        <div className="grid grid-cols-2 gap-3">
          <Campo etichetta="Provincia" id="i-prov" value={i.provincia} onChange={set("provincia")} maxLength={2} className="uppercase" placeholder="SR" />
          <Campo etichetta="CAP" id="i-cap" value={i.cap} onChange={set("cap")} inputMode="numeric" maxLength={5} />
        </div>
        <Campo etichetta="Zona urbanistica" id="i-zona" value={i.zona_urbanistica} onChange={set("zona_urbanistica")} placeholder="B2" />
      </div>

      <fieldset className="flex flex-col gap-4 border-t border-linea pt-5">
        <legend className="mb-3 text-[0.9375rem] font-medium">Dati catastali</legend>
        <Segmenti
          etichetta="Catasto"
          valore={i.catasto.catasto as "fabbricati" | "terreni"}
          opzioni={[
            { valore: "fabbricati", etichetta: "Fabbricati" },
            { valore: "terreni", etichetta: "Terreni" },
          ]}
          onCambia={(v) => onCambia({ ...i, catasto: { ...i.catasto, catasto: v } })}
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Campo etichetta="Foglio" id="i-foglio" value={i.catasto.foglio} onChange={setCat("foglio")} inputMode="numeric" />
          <Campo etichetta="Particella" id="i-part" value={i.catasto.particella} onChange={setCat("particella")} />
          <Campo etichetta="Subalterno" id="i-sub" value={i.catasto.subalterno} onChange={setCat("subalterno")} />
          <Campo etichetta="Categoria" id="i-cat" value={i.catasto.categoria} onChange={setCat("categoria")} placeholder="A/2" />
        </div>
        <p className="text-sm text-tenue">Facoltativi. Altri identificativi si aggiungono dalla scheda dell&apos;immobile.</p>
      </fieldset>
    </div>
  );
}

function Riga({ etichetta, valore }: { etichetta: string; valore?: string | null }) {
  return (
    <div>
      <dt className="etichetta">{etichetta}</dt>
      <dd className={cn("mt-0.5", valore ? "" : "text-tenue")}>{valore || "—"}</dd>
    </div>
  );
}
