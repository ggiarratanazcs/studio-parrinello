"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AreaTesto, Campo, Messaggio, Segmenti, Selezione } from "@/components/campo";
import { PassoCommittente, PassoImmobile, useCommittenteImmobile } from "@/components/procedura/committente-immobile";
import { CorniceProcedura, navigazionePassi } from "@/components/procedura/struttura";
import { aggiornaPrefattibilita, creaPrefattibilita } from "@/lib/azioni";
import { ESITI_PREFATTIBILITA, PARERI_ENTI, TIPOLOGIE_INTERVENTO, TITOLI_EDILIZI, VINCOLI } from "@/lib/dominio";
import { numero } from "@/lib/preventivo";
import type { DatiProcedura, PrefattibilitaDaModificare } from "@/lib/dati";
import { cn, formattaEuro } from "@/lib/utils";

type Committenza = "privata" | "pubblica";

const PASSI = ["Committente", "Immobile", "Analisi", "Stima ed esito"] as const;
const TITOLI = ["Per chi è la pre-fattibilità?", "Quale immobile o area?", "Analisi urbanistica e conformità", "Stima ed esito"];

export function ProceduraNuovaPrefattibilita({
  dati,
  oggi,
  esistente,
  onSalvata,
}: {
  dati: DatiProcedura;
  oggi: string;
  /** In modifica: la pre-fattibilità da aggiornare, con i campi già compilati */
  esistente?: PrefattibilitaDaModificare;
  /** Dopo il salvataggio (es. chiudere la finestra); di base apre la scheda */
  onSalvata?: (id: string) => void;
}) {
  const router = useRouter();
  const ctl = useCommittenteImmobile(
    dati,
    esistente
      ? { clienteId: esistente.cliente_id ?? undefined, immobileId: esistente.immobile_id ?? undefined, immobileNessuno: !esistente.immobile_id }
      : {},
  );
  const [passo, setPasso] = useState(esistente ? 2 : 0);
  const [errori, setErrori] = useState<Record<string, string>>({});
  const [erroreInvio, setErroreInvio] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();
  const [committenzaToccata, setCommittenzaToccata] = useState(Boolean(esistente));

  const testo = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v));
  const [a, setA] = useState(() => esistente ? {
    titolo: esistente.titolo ?? "",
    committenza: (esistente.committenza ?? "privata") as Committenza,
    tipologia_intervento: esistente.tipologia_intervento ?? "",
    responsabile_id: esistente.responsabile_id ?? "",
    strumento_urbanistico: esistente.strumento_urbanistico ?? "",
    zona_urbanistica: esistente.zona_urbanistica ?? "",
    indici_parametri: esistente.indici_parametri ?? "",
    vincoli: (esistente.vincoli ?? []) as string[],
    vincoli_note: esistente.vincoli_note ?? "",
    accesso_atti_richiesto: Boolean(esistente.accesso_atti_richiesto),
    stato_legittimo_verificato: Boolean(esistente.stato_legittimo_verificato),
    difformita_rilevate: Boolean(esistente.difformita_rilevate),
    difformita_descrizione: esistente.difformita_descrizione ?? "",
    sanatoria_necessaria: Boolean(esistente.sanatoria_necessaria),
    titolo_edilizio: esistente.titolo_edilizio ?? "",
    pareri_enti: (esistente.pareri_enti ?? []) as string[],
    superficie_intervento_mq: testo(esistente.superficie_intervento_mq),
    costo_parametrico_mq: testo(esistente.costo_parametrico_mq),
    durata_stimata_mesi: testo(esistente.durata_stimata_mesi),
    onorario: testo(esistente.onorario),
    esito: esistente.esito ?? "",
    sintesi: esistente.sintesi ?? "",
    data_redazione: esistente.data_redazione ?? oggi,
  } : {
    titolo: "",
    committenza: "privata" as Committenza,
    tipologia_intervento: "",
    responsabile_id: "",
    strumento_urbanistico: "",
    zona_urbanistica: "",
    indici_parametri: "",
    vincoli: [] as string[],
    vincoli_note: "",
    accesso_atti_richiesto: false,
    stato_legittimo_verificato: false,
    difformita_rilevate: false,
    difformita_descrizione: "",
    sanatoria_necessaria: false,
    titolo_edilizio: "",
    pareri_enti: [] as string[],
    superficie_intervento_mq: "",
    costo_parametrico_mq: "",
    durata_stimata_mesi: "",
    onorario: "",
    esito: "",
    sintesi: "",
    data_redazione: oggi,
  });

  const committenza: Committenza = committenzaToccata
    ? a.committenza
    : ctl.tipoCommittente === "ente_pubblico"
      ? "pubblica"
      : "privata";
  const costoOpere = numero(a.superficie_intervento_mq) * numero(a.costo_parametrico_mq);

  const nav = navigazionePassi(passo, PASSI.length, setPasso, setErrori, [
    ctl.erroriCommittente,
    ctl.erroriImmobile,
    () => (a.titolo.trim() ? {} : { titolo: 'Dai un titolo, per esempio "Ampliamento capannone Melilli".' }),
    () => ({}),
  ]);

  function alterna(campo: "vincoli" | "pareri_enti", voce: string) {
    setA({ ...a, [campo]: a[campo].includes(voce) ? a[campo].filter((x) => x !== voce) : [...a[campo], voce] });
  }

  function salva() {
    if (!nav.validaTutto()) return;
    setErroreInvio(null);
    avvia(async () => {
      const payload = { ...ctl.payload, analisi: { ...a, committenza } };
      const esito = esistente ? await aggiornaPrefattibilita(esistente.id, payload) : await creaPrefattibilita(payload);
      if (esito.ok) {
        if (onSalvata) onSalvata(esito.id);
        else router.push(`/prefattibilita/${esito.id}`);
      }
      else setErroreInvio(esito.errore);
    });
  }

  const reset = () => setErrori({});

  return (
    <CorniceProcedura
      nomi={PASSI}
      passo={passo}
      titolo={TITOLI[passo]}
      onVai={nav.vaiA}
      onAvanti={nav.avanti}
      onSalva={salva}
      etichettaSalva={esistente ? "Salva modifiche" : "Crea pre-fattibilità"}
      inCorso={inCorso}
      riepilogo={[
        ...(esistente ? [{ etichetta: "In modifica", valore: esistente.numero }] : []),
        { etichetta: "Committente", valore: ctl.nomeCommittente },
        { etichetta: "Immobile", valore: ctl.descrizioneImmobile },
        { etichetta: "Titolo", valore: a.titolo },
        { etichetta: "Titolo edilizio", valore: TITOLI_EDILIZI[a.titolo_edilizio] },
        { etichetta: "Costo opere stimato", valore: costoOpere ? formattaEuro(costoOpere) : null },
        { etichetta: "Esito", valore: ESITI_PREFATTIBILITA[a.esito] },
      ]}
    >
      {passo === 0 ? <PassoCommittente ctl={ctl} errori={errori} onReset={reset} /> : null}
      {passo === 1 ? <PassoImmobile ctl={ctl} errori={errori} onReset={reset} /> : null}

      {passo === 2 ? (
        <>
          <Campo etichetta="Titolo" id="titolo" obbligatorio value={a.titolo} onChange={(e) => setA({ ...a, titolo: e.target.value })} placeholder="Ampliamento capannone Melilli" errore={errori.titolo} />
          <Segmenti
            etichetta="Committenza"
            valore={committenza}
            opzioni={[
              { valore: "privata", etichetta: "Privata" },
              { valore: "pubblica", etichetta: "Pubblica" },
            ]}
            onCambia={(v) => {
              setCommittenzaToccata(true);
              setA({ ...a, committenza: v });
            }}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Selezione etichetta="Tipologia di intervento" id="tipologia" value={a.tipologia_intervento} onChange={(e) => setA({ ...a, tipologia_intervento: e.target.value })}>
              <option value="">Da definire</option>
              {Object.entries(TIPOLOGIE_INTERVENTO).map(([v, e]) => (
                <option key={v} value={v}>{e}</option>
              ))}
            </Selezione>
            <Selezione etichetta="Responsabile" id="responsabile" value={a.responsabile_id} onChange={(e) => setA({ ...a, responsabile_id: e.target.value })}>
              <option value="">Da assegnare</option>
              {dati.profili.map((p) => (
                <option key={p.id} value={p.id}>{[p.nome, p.cognome].filter(Boolean).join(" ") || p.email}</option>
              ))}
            </Selezione>
            <Campo etichetta="Strumento urbanistico" id="strumento" value={a.strumento_urbanistico} onChange={(e) => setA({ ...a, strumento_urbanistico: e.target.value })} placeholder="PRG Siracusa 2007" />
            <Campo etichetta="Zona urbanistica" id="zona" value={a.zona_urbanistica} onChange={(e) => setA({ ...a, zona_urbanistica: e.target.value })} placeholder="B2" />
          </div>
          <AreaTesto etichetta="Indici e parametri" id="indici" value={a.indici_parametri} onChange={(e) => setA({ ...a, indici_parametri: e.target.value })} placeholder="Indice fondiario, rapporto di copertura, altezza massima, distanze…" className="min-h-20" />

          <Gruppo titolo="Vincoli">
            <Spunte voci={VINCOLI} scelte={a.vincoli} onAlterna={(v) => alterna("vincoli", v)} />
            <Campo etichetta="Note sui vincoli" id="vincoli-note" value={a.vincoli_note} onChange={(e) => setA({ ...a, vincoli_note: e.target.value })} />
          </Gruppo>

          <Gruppo titolo="Conformità edilizia">
            <div className="grid gap-1 md:grid-cols-2">
              <Spunta etichetta="Accesso agli atti richiesto" valore={a.accesso_atti_richiesto} onCambia={(v) => setA({ ...a, accesso_atti_richiesto: v })} />
              <Spunta etichetta="Stato legittimo verificato" valore={a.stato_legittimo_verificato} onCambia={(v) => setA({ ...a, stato_legittimo_verificato: v })} />
              <Spunta etichetta="Difformità rilevate" valore={a.difformita_rilevate} onCambia={(v) => setA({ ...a, difformita_rilevate: v })} />
              <Spunta etichetta="Sanatoria necessaria" valore={a.sanatoria_necessaria} onCambia={(v) => setA({ ...a, sanatoria_necessaria: v })} />
            </div>
            {a.difformita_rilevate ? (
              <AreaTesto etichetta="Descrizione delle difformità" id="difformita" value={a.difformita_descrizione} onChange={(e) => setA({ ...a, difformita_descrizione: e.target.value })} className="min-h-20" />
            ) : null}
          </Gruppo>

          <Gruppo titolo="Titolo edilizio e pareri">
            <Selezione etichetta="Titolo edilizio ipotizzato" id="titolo-edilizio" value={a.titolo_edilizio} onChange={(e) => setA({ ...a, titolo_edilizio: e.target.value })}>
              <option value="">Da valutare</option>
              {Object.entries(TITOLI_EDILIZI).map(([v, e]) => (
                <option key={v} value={v}>{e}</option>
              ))}
            </Selezione>
            <span className="text-sm font-medium text-inchiostro-2">Pareri e nulla osta da acquisire</span>
            <Spunte voci={PARERI_ENTI} scelte={a.pareri_enti} onAlterna={(v) => alterna("pareri_enti", v)} />
          </Gruppo>
        </>
      ) : null}

      {passo === 3 ? (
        <>
          <div className="grid gap-5 md:grid-cols-3">
            <Campo etichetta="Superficie di intervento (mq)" id="superficie" type="number" inputMode="decimal" min={0} step="any" value={a.superficie_intervento_mq} onChange={(e) => setA({ ...a, superficie_intervento_mq: e.target.value })} />
            <Campo etichetta="Costo parametrico (€/mq)" id="costo-mq" type="number" inputMode="decimal" min={0} step="any" value={a.costo_parametrico_mq} onChange={(e) => setA({ ...a, costo_parametrico_mq: e.target.value })} />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-inchiostro-2">Costo opere stimato</span>
              <span className="numeri flex h-11 items-center rounded-m bg-superficie-2/60 px-3 text-base">{costoOpere ? formattaEuro(costoOpere) : "—"}</span>
            </div>
            <Campo etichetta="Durata stimata (mesi)" id="durata" type="number" min={0} value={a.durata_stimata_mesi} onChange={(e) => setA({ ...a, durata_stimata_mesi: e.target.value })} />
            <Campo etichetta="Onorario della pre-fattibilità (€)" id="onorario" type="number" inputMode="decimal" min={0} step="any" value={a.onorario} onChange={(e) => setA({ ...a, onorario: e.target.value })} aiuto="Se la pre-fattibilità è a pagamento." />
            <Campo etichetta="Data di redazione" id="data" type="date" value={a.data_redazione} onChange={(e) => setA({ ...a, data_redazione: e.target.value })} />
          </div>
          <Selezione etichetta="Esito" id="esito" value={a.esito} onChange={(e) => setA({ ...a, esito: e.target.value })}>
            <option value="">Da definire</option>
            {Object.entries(ESITI_PREFATTIBILITA).map(([v, e]) => (
              <option key={v} value={v}>{e}</option>
            ))}
          </Selezione>
          <AreaTesto etichetta="Sintesi per il committente" id="sintesi" value={a.sintesi} onChange={(e) => setA({ ...a, sintesi: e.target.value })} placeholder="Cosa si può fare, con quale titolo, in quanto tempo e con quale costo indicativo" />
          {erroreInvio ? <Messaggio tipo="errore">{erroreInvio}</Messaggio> : null}
        </>
      ) : null}
    </CorniceProcedura>
  );
}

function Gruppo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 border-t border-linea pt-5">
      <legend className="mb-3 text-[0.9375rem] font-medium">{titolo}</legend>
      {children}
    </fieldset>
  );
}

function Spunta({ etichetta, valore, onCambia }: { etichetta: string; valore: boolean; onCambia: (v: boolean) => void }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-3 rounded-m px-3 py-2.5 transition-colors", valore ? "bg-accento-tenue" : "hover:bg-superficie-2/60")}>
      <input type="checkbox" className="size-4 accent-[color:var(--accento)]" checked={valore} onChange={(e) => onCambia(e.target.checked)} />
      <span className="text-[0.9375rem]">{etichetta}</span>
    </label>
  );
}

function Spunte({ voci, scelte, onAlterna }: { voci: string[]; scelte: string[]; onAlterna: (v: string) => void }) {
  return (
    <div className="grid gap-1 md:grid-cols-2">
      {voci.map((v) => (
        <Spunta key={v} etichetta={v} valore={scelte.includes(v)} onCambia={() => onAlterna(v)} />
      ))}
    </div>
  );
}
