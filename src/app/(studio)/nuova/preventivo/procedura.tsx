"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { AreaTesto, Campo, Messaggio, Segmenti, Selezione } from "@/components/campo";
import { PassoCommittente, PassoImmobile, useCommittenteImmobile } from "@/components/procedura/committente-immobile";
import { CorniceProcedura, navigazionePassi } from "@/components/procedura/struttura";
import { aggiornaPreventivo, creaPreventivo } from "@/lib/azioni";
import { TIPOLOGIE_INTERVENTO } from "@/lib/dominio";
import { propostaFasi } from "@/lib/fasi";
import { CONDIZIONI_PREDEFINITE, METODI_CALCOLO, calcolaTotali, numero } from "@/lib/preventivo";
import type { DatiProcedura, PreventivoDaModificare } from "@/lib/dati";
import type { OrigineNuovoPreventivo } from "@/lib/origine-preventivo";
import { formattaEuro } from "@/lib/utils";

type Committenza = "privata" | "pubblica";
type Voce = { chiave: string; fase_catalogo_id: string; descrizione: string; prezzo: string; ore: string; opzionale: boolean };

export type { OrigineNuovoPreventivo };

const PASSI = ["Committente", "Immobile", "Offerta", "Condizioni"] as const;
const TITOLI = ["A chi è rivolto il preventivo?", "Su quale immobile?", "L'offerta", "Condizioni e totale"];

let contatore = 0;
const nuovaChiave = () => `v${++contatore}`;

export function ProceduraNuovoPreventivo({
  dati,
  oggi,
  origine,
  esistente,
  onCreato,
}: {
  dati: DatiProcedura;
  oggi: string;
  origine: OrigineNuovoPreventivo;
  /** In modifica: il preventivo da aggiornare, con i campi già compilati */
  esistente?: PreventivoDaModificare;
  /** Dopo la creazione (es. chiudere la finestra); di base apre la scheda del nuovo preventivo */
  onCreato?: (id: string) => void;
}) {
  const router = useRouter();
  const ctl = useCommittenteImmobile(
    dati,
    esistente
      ? { clienteId: esistente.cliente_id ?? undefined, immobileId: esistente.immobile_id ?? undefined, immobileNessuno: !esistente.immobile_id }
      : { clienteId: origine?.cliente_id ?? undefined, immobileId: origine?.immobile_id ?? undefined },
  );
  // Con committente già noto (in modifica, da pre-fattibilità o commessa) si parte direttamente dall'offerta
  const [passo, setPasso] = useState(esistente || origine?.cliente_id ? 2 : 0);
  const [errori, setErrori] = useState<Record<string, string>>({});
  const [erroreInvio, setErroreInvio] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  const testo = (v: number | string | null | undefined, predefinito = "") => (v === null || v === undefined ? predefinito : String(v));
  const [offerta, setOfferta] = useState(() =>
    esistente
      ? {
          titolo: esistente.titolo ?? "",
          oggetto: esistente.oggetto ?? "",
          committenza: (esistente.committenza ?? "privata") as Committenza,
          tipologia_intervento: esistente.tipologia_intervento ?? "",
          responsabile_id: esistente.responsabile_id ?? "",
          data_emissione: esistente.data_emissione ?? oggi,
          validita_giorni: testo(esistente.validita_giorni, "30"),
          metodo_calcolo: esistente.metodo_calcolo ?? "a_corpo",
          importo_lavori: testo(esistente.importo_lavori),
          percentuale_onorario: testo(esistente.percentuale_onorario),
        }
      : {
    titolo: origine?.titolo ?? "",
    oggetto: origine?.oggetto ?? "",
    committenza: (origine?.committenza ?? "privata") as Committenza,
    tipologia_intervento: origine?.tipologia_intervento ?? "",
    responsabile_id: origine?.responsabile_id ?? "",
    data_emissione: oggi,
    validita_giorni: "30",
    metodo_calcolo: "a_corpo",
    importo_lavori: origine?.importo_lavori ? String(origine.importo_lavori) : "",
    percentuale_onorario: "",
        },
  );
  const [committenzaToccata, setCommittenzaToccata] = useState(Boolean(origine || esistente));
  const [voci, setVoci] = useState<Voce[] | null>(() =>
    esistente
      ? esistente.voci.map((v) => ({
          chiave: nuovaChiave(),
          fase_catalogo_id: v.fase_catalogo_id ?? "",
          descrizione: v.descrizione,
          prezzo: testo(v.prezzo_unitario),
          ore: testo(v.ore_stimate),
          opzionale: v.opzionale,
        }))
      : origine?.voci
      ? origine.voci.map((v) => ({ chiave: nuovaChiave(), fase_catalogo_id: "", descrizione: v.descrizione, prezzo: v.prezzo ?? "", ore: "", opzionale: false }))
      : null,
  ); // null = proposte dalle fasi tipiche
  const [condizioni, setCondizioni] = useState(() => ({
    sconto: testo(esistente?.sconto_pct, "0"),
    spese: testo(esistente?.spese_pct, "0"),
    cassa: testo(esistente?.cassa_pct, "4"),
    iva: testo(esistente?.iva_pct, "22"),
    ritenuta: testo(esistente?.ritenuta_pct, "0"),
    condizioni_pagamento: esistente ? (esistente.condizioni_pagamento ?? "") : CONDIZIONI_PREDEFINITE,
    note: esistente?.note ?? "",
  }));

  const committenza: Committenza = committenzaToccata
    ? offerta.committenza
    : ctl.tipoCommittente === "ente_pubblico"
      ? "pubblica"
      : "privata";

  /** Voci proposte a partire dalle fasi tipiche; generate al primo ingresso nel passo Offerta. */
  const vociProposte = useMemo<Voce[]>(() => {
    const codici = propostaFasi(committenza, offerta.tipologia_intervento || null);
    return dati.fasi
      .filter((f) => codici.includes(f.codice))
      .map((f) => ({ chiave: nuovaChiave(), fase_catalogo_id: f.id, descrizione: f.nome, prezzo: "", ore: "", opzionale: false }));
  }, [committenza, offerta.tipologia_intervento, dati.fasi]);
  const righe = voci ?? vociProposte;

  const totali = calcolaTotali(
    righe.map((v) => ({ importo: numero(v.prezzo), opzionale: v.opzionale })),
    {
      sconto: numero(condizioni.sconto),
      spese: numero(condizioni.spese),
      cassa: numero(condizioni.cassa),
      iva: numero(condizioni.iva),
      ritenuta: numero(condizioni.ritenuta),
    },
  );

  const compensoPercentuale =
    offerta.metodo_calcolo === "percentuale_lavori" && numero(offerta.importo_lavori) && numero(offerta.percentuale_onorario)
      ? (numero(offerta.importo_lavori) * numero(offerta.percentuale_onorario)) / 100
      : null;

  const nav = navigazionePassi(passo, PASSI.length, setPasso, setErrori, [
    ctl.erroriCommittente,
    ctl.erroriImmobile,
    () => {
      const e: Record<string, string> = {};
      if (!offerta.titolo.trim()) e.titolo = 'Dai un titolo al preventivo, per esempio "Ristrutturazione Villa M".';
      if (!righe.some((v) => v.descrizione.trim() && numero(v.prezzo) > 0)) e.voci = "Inserisci almeno una voce con un importo.";
      return e;
    },
    () => ({}),
  ]);

  function aggiornaVoce(chiave: string, campo: keyof Voce, valore: string | boolean) {
    setVoci(righe.map((v) => (v.chiave === chiave ? { ...v, [campo]: valore } : v)));
  }

  function salva() {
    if (!nav.validaTutto()) return;
    const payload = {
      ...ctl.payload,
      preventivo: {
        ...offerta,
        committenza,
        prefattibilita_id: origine?.tipo === "prefattibilita" ? origine.id : null,
        commessa_id: origine?.tipo === "commessa" ? origine.id : null,
        sconto_pct: condizioni.sconto,
        spese_pct: condizioni.spese,
        cassa_pct: condizioni.cassa,
        iva_pct: condizioni.iva,
        ritenuta_pct: condizioni.ritenuta,
        condizioni_pagamento: condizioni.condizioni_pagamento,
        note: condizioni.note,
        imponibile: totali.imponibile,
        totale_cassa: totali.cassa,
        totale_iva: totali.iva,
        totale_documento: totali.totale,
      },
      voci: righe
        .filter((v) => v.descrizione.trim())
        .map((v) => ({
          fase_catalogo_id: v.fase_catalogo_id || null,
          descrizione: v.descrizione,
          prezzo_unitario: numero(v.prezzo),
          ore_stimate: v.ore ? numero(v.ore) : null,
          opzionale: v.opzionale,
        })),
    };
    setErroreInvio(null);
    avvia(async () => {
      const esito = esistente ? await aggiornaPreventivo(esistente.id, payload) : await creaPreventivo(payload);
      if (esito.ok) {
        if (onCreato) onCreato(esito.id);
        else router.push(`/preventivi/${esito.id}`);
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
      etichettaSalva={esistente ? "Salva modifiche" : origine?.tipo === "commessa" ? "Crea preventivo integrativo" : "Crea preventivo"}
      inCorso={inCorso}
      riepilogo={[
        ...(esistente ? [{ etichetta: "In modifica", valore: esistente.numero }] : []),
        ...(origine ? [{ etichetta: origine.tipo === "commessa" ? "Integrativo della commessa" : "Da pre-fattibilità", valore: origine.numero }] : []),
        { etichetta: "Committente", valore: ctl.nomeCommittente },
        { etichetta: "Immobile", valore: ctl.descrizioneImmobile },
        { etichetta: "Titolo", valore: offerta.titolo },
        { etichetta: "Imponibile", valore: totali.imponibile ? formattaEuro(totali.imponibile) : null },
        { etichetta: "Totale documento", valore: totali.totale ? formattaEuro(totali.totale) : null },
      ]}
    >
      {passo === 0 ? <PassoCommittente ctl={ctl} errori={errori} onReset={reset} /> : null}
      {passo === 1 ? <PassoImmobile ctl={ctl} errori={errori} onReset={reset} /> : null}

      {passo === 2 ? (
        <>
          <Campo
            etichetta="Titolo"
            id="titolo"
            obbligatorio
            value={offerta.titolo}
            onChange={(e) => setOfferta({ ...offerta, titolo: e.target.value })}
            placeholder="Ristrutturazione Villa M"
            errore={errori.titolo}
          />
          <AreaTesto
            etichetta="Oggetto della prestazione"
            id="oggetto"
            value={offerta.oggetto}
            onChange={(e) => setOfferta({ ...offerta, oggetto: e.target.value })}
            placeholder="Progettazione definitiva ed esecutiva, pratiche autorizzative e direzione lavori per…"
            className="min-h-20"
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
              setOfferta({ ...offerta, committenza: v });
              setVoci(null);
            }}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Selezione
              etichetta="Tipologia di intervento"
              id="tipologia"
              value={offerta.tipologia_intervento}
              onChange={(e) => setOfferta({ ...offerta, tipologia_intervento: e.target.value })}
            >
              <option value="">Da definire</option>
              {Object.entries(TIPOLOGIE_INTERVENTO).map(([v, e]) => (
                <option key={v} value={v}>{e}</option>
              ))}
            </Selezione>
            <Selezione etichetta="Responsabile" id="responsabile" value={offerta.responsabile_id} onChange={(e) => setOfferta({ ...offerta, responsabile_id: e.target.value })}>
              <option value="">Da assegnare</option>
              {dati.profili.map((p) => (
                <option key={p.id} value={p.id}>{[p.nome, p.cognome].filter(Boolean).join(" ") || p.email}</option>
              ))}
            </Selezione>
            <Selezione etichetta="Metodo di calcolo" id="metodo" value={offerta.metodo_calcolo} onChange={(e) => setOfferta({ ...offerta, metodo_calcolo: e.target.value })}>
              {Object.entries(METODI_CALCOLO).map(([v, e]) => (
                <option key={v} value={v}>{e}</option>
              ))}
            </Selezione>
            <Campo
              etichetta="Importo lavori stimato (€)"
              id="importo"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={offerta.importo_lavori}
              onChange={(e) => setOfferta({ ...offerta, importo_lavori: e.target.value })}
            />
            {offerta.metodo_calcolo === "percentuale_lavori" ? (
              <Campo
                etichetta="Percentuale di onorario (%)"
                id="perc"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={offerta.percentuale_onorario}
                onChange={(e) => setOfferta({ ...offerta, percentuale_onorario: e.target.value })}
                aiuto={compensoPercentuale ? `Compenso di riferimento: ${formattaEuro(compensoPercentuale)}, da ripartire sulle voci.` : undefined}
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-linea pt-5">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-[0.9375rem] font-medium">Voci</h3>
              <span className="numeri text-sm text-tenue">Subtotale {formattaEuro(totali.subtotale)}</span>
            </div>
            <p className="text-sm text-tenue">
              Proposte dalle fasi tipiche: ogni voce collegata a una fase diventerà la fase della commessa, con il suo onorario e le ore.
            </p>
            <div className="hidden grid-cols-[minmax(0,1fr)_8rem_5.5rem_2.5rem] gap-2 px-1 md:grid">
              <span className="etichetta">Descrizione</span>
              <span className="etichetta text-right">Importo (€)</span>
              <span className="etichetta text-right">Ore stimate</span>
              <span />
            </div>
            <ul className="flex flex-col gap-3 md:gap-2">
              {righe.map((v) => (
                <li key={v.chiave} className="grid grid-cols-[minmax(0,1fr)_2.5rem] gap-2 rounded-medio border border-linea p-2 md:grid-cols-[minmax(0,1fr)_8rem_5.5rem_2.5rem] md:border-0 md:p-0">
                  <input
                    aria-label="Descrizione della voce"
                    value={v.descrizione}
                    onChange={(e) => aggiornaVoce(v.chiave, "descrizione", e.target.value)}
                    className="h-10 min-w-0 rounded-medio border border-linea-forte bg-superficie px-3 text-[0.9375rem] outline-none focus:border-accento"
                  />
                  <button
                    type="button"
                    onClick={() => setVoci(righe.filter((x) => x.chiave !== v.chiave))}
                    className="grid size-10 place-items-center rounded-medio text-tenue hover:bg-superficie-2 hover:text-inchiostro md:order-last"
                    aria-label={`Togli ${v.descrizione || "voce"}`}
                    data-suggerimento="Togli la voce"
                  >
                    <X className="size-4" />
                  </button>
                  <input
                    aria-label="Importo"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    placeholder="Importo €"
                    value={v.prezzo}
                    onChange={(e) => aggiornaVoce(v.chiave, "prezzo", e.target.value)}
                    className="numeri h-10 rounded-medio border border-linea-forte bg-superficie px-3 text-right text-[0.9375rem] outline-none focus:border-accento"
                  />
                  <input
                    aria-label="Ore stimate"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    placeholder="Ore"
                    value={v.ore}
                    onChange={(e) => aggiornaVoce(v.chiave, "ore", e.target.value)}
                    className="numeri h-10 rounded-medio border border-linea-forte bg-superficie px-3 text-right text-[0.9375rem] outline-none focus:border-accento"
                  />
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setVoci([...righe, { chiave: nuovaChiave(), fase_catalogo_id: "", descrizione: "", prezzo: "", ore: "", opzionale: false }])}
              className="inline-flex items-center gap-1.5 self-start text-sm text-accento hover:underline"
            >
              <Plus className="size-4" /> Aggiungi voce
            </button>
            {errori.voci ? <Messaggio tipo="errore">{errori.voci}</Messaggio> : null}
          </div>
        </>
      ) : null}

      {passo === 3 ? (
        <>
          <div className="grid gap-5 sm:grid-cols-3 md:grid-cols-5">
            <Campo etichetta="Sconto %" id="sconto" type="number" inputMode="decimal" min={0} step="any" value={condizioni.sconto} onChange={(e) => setCondizioni({ ...condizioni, sconto: e.target.value })} />
            <Campo etichetta="Spese %" id="spese" type="number" inputMode="decimal" min={0} step="any" value={condizioni.spese} onChange={(e) => setCondizioni({ ...condizioni, spese: e.target.value })} />
            <Campo etichetta="Cassa %" id="cassa" type="number" inputMode="decimal" min={0} step="any" value={condizioni.cassa} onChange={(e) => setCondizioni({ ...condizioni, cassa: e.target.value })} />
            <Campo etichetta="IVA %" id="iva" type="number" inputMode="decimal" min={0} step="any" value={condizioni.iva} onChange={(e) => setCondizioni({ ...condizioni, iva: e.target.value })} />
            <Campo etichetta="Ritenuta %" id="ritenuta" type="number" inputMode="decimal" min={0} step="any" value={condizioni.ritenuta} onChange={(e) => setCondizioni({ ...condizioni, ritenuta: e.target.value })} />
          </div>
          <p className="-mt-2 text-sm text-tenue">
            Cassa al 4% (Inarcassa). Ritenuta al 20% solo se il committente è sostituto d&apos;imposta.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <Campo etichetta="Data di emissione" id="emissione" type="date" value={offerta.data_emissione} onChange={(e) => setOfferta({ ...offerta, data_emissione: e.target.value })} />
            <Campo etichetta="Validità (giorni)" id="validita" type="number" min={1} value={offerta.validita_giorni} onChange={(e) => setOfferta({ ...offerta, validita_giorni: e.target.value })} />
          </div>
          <AreaTesto etichetta="Condizioni di pagamento" id="condizioni" value={condizioni.condizioni_pagamento} onChange={(e) => setCondizioni({ ...condizioni, condizioni_pagamento: e.target.value })} className="min-h-20" />
          <AreaTesto etichetta="Note" id="note" value={condizioni.note} onChange={(e) => setCondizioni({ ...condizioni, note: e.target.value })} className="min-h-20" />

          <dl className="numeri ml-auto grid w-full max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 rounded-medio bg-superficie-2/60 p-4 text-[0.9375rem]">
            <dt className="text-tenue">Subtotale voci</dt><dd className="text-right">{formattaEuro(totali.subtotale)}</dd>
            {totali.sconto ? (<><dt className="text-tenue">Sconto</dt><dd className="text-right">− {formattaEuro(totali.sconto)}</dd></>) : null}
            {totali.spese ? (<><dt className="text-tenue">Spese</dt><dd className="text-right">{formattaEuro(totali.spese)}</dd></>) : null}
            <dt className="text-tenue">Imponibile</dt><dd className="text-right">{formattaEuro(totali.imponibile)}</dd>
            <dt className="text-tenue">Cassa previdenziale</dt><dd className="text-right">{formattaEuro(totali.cassa)}</dd>
            <dt className="text-tenue">IVA</dt><dd className="text-right">{formattaEuro(totali.iva)}</dd>
            <dt className="border-t border-linea-forte pt-1.5 font-medium">Totale documento</dt>
            <dd className="border-t border-linea-forte pt-1.5 text-right font-medium">{formattaEuro(totali.totale)}</dd>
            {totali.ritenuta ? (<><dt className="text-tenue">Netto a pagare</dt><dd className="text-right">{formattaEuro(totali.netto)}</dd></>) : null}
          </dl>
          {erroreInvio ? <Messaggio tipo="errore">{erroreInvio}</Messaggio> : null}
        </>
      ) : null}
    </CorniceProcedura>
  );
}
