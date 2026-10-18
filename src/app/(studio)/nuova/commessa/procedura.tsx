"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AreaTesto, Campo, Messaggio, Segmenti, Selezione } from "@/components/campo";
import { PassoCommittente, PassoImmobile, useCommittenteImmobile } from "@/components/procedura/committente-immobile";
import { CorniceProcedura, navigazionePassi } from "@/components/procedura/struttura";
import { SceltaFasi } from "@/components/procedura/scelta-fasi";
import { creaCommessa } from "@/lib/azioni";
import { AMBITI, STATI_COMMESSA, TIPOLOGIE_INTERVENTO } from "@/lib/dominio";
import { propostaFasi } from "@/lib/fasi";
import type { DatiProcedura } from "@/lib/dati";

type Committenza = "privata" | "pubblica";

const PASSI = ["Committente", "Immobile", "Incarico", "Fasi"] as const;
const TITOLI = ["Chi è il committente?", "Su quale immobile si interviene?", "L'incarico", "Le fasi della commessa"];
const STATI_INIZIALI = ["contatto", "prefattibilita", "preventivo", "attiva"] as const;

export function ProceduraNuovaCommessa({ dati, oggi }: { dati: DatiProcedura; oggi: string }) {
  const router = useRouter();
  const ctl = useCommittenteImmobile(dati);
  const [passo, setPasso] = useState(0);
  const [errori, setErrori] = useState<Record<string, string>>({});
  const [erroreInvio, setErroreInvio] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  const [incarico, setIncarico] = useState({
    titolo: "",
    committenza: "privata" as Committenza,
    tipologia_intervento: "",
    ambito: "",
    stato: "attiva",
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
  const [fasiScelte, setFasiScelte] = useState<string[] | null>(null);

  const committenza: Committenza = committenzaToccata
    ? incarico.committenza
    : ctl.tipoCommittente === "ente_pubblico"
      ? "pubblica"
      : "privata";
  const proposta = useMemo(
    () => propostaFasi(committenza, incarico.tipologia_intervento || null),
    [committenza, incarico.tipologia_intervento],
  );
  const codiciFasi = fasiScelte ?? proposta;

  const nav = navigazionePassi(passo, PASSI.length, setPasso, setErrori, [
    ctl.erroriCommittente,
    ctl.erroriImmobile,
    () => (incarico.titolo.trim() ? {} : { titolo: 'Dai un titolo alla commessa, per esempio "Ristrutturazione Villa M".' }),
    () => ({}),
  ]);

  function salva() {
    if (!nav.validaTutto()) return;
    const fasi = dati.fasi
      .filter((f) => codiciFasi.includes(f.codice))
      .map((f) => ({ fase_catalogo_id: f.id, codice: f.codice, nome: f.nome }));
    setErroreInvio(null);
    avvia(async () => {
      const esito = await creaCommessa({ ...ctl.payload, commessa: { ...incarico, committenza }, fasi });
      if (esito.ok) router.push(`/commesse/${esito.id}`);
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
      etichettaSalva="Crea commessa"
      inCorso={inCorso}
      riepilogo={[
        { etichetta: "Committente", valore: ctl.nomeCommittente },
        { etichetta: "Immobile", valore: ctl.descrizioneImmobile },
        { etichetta: "Titolo", valore: incarico.titolo },
        { etichetta: "Committenza", valore: committenza === "pubblica" ? "Pubblica" : "Privata" },
        { etichetta: "Fasi", valore: `${codiciFasi.length} selezionate` },
      ]}
    >
      {passo === 0 ? <PassoCommittente ctl={ctl} errori={errori} onReset={reset} /> : null}
      {passo === 1 ? <PassoImmobile ctl={ctl} errori={errori} onReset={reset} /> : null}

      {passo === 2 ? (
        <>
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
            <Selezione etichetta="Tipologia di intervento" id="tipologia" value={incarico.tipologia_intervento} onChange={(e) => setIncarico({ ...incarico, tipologia_intervento: e.target.value })}>
              <option value="">Da definire</option>
              {Object.entries(TIPOLOGIE_INTERVENTO).map(([v, e]) => (
                <option key={v} value={v}>{e}</option>
              ))}
            </Selezione>
            <Selezione etichetta="Ambito" id="ambito" value={incarico.ambito} onChange={(e) => setIncarico({ ...incarico, ambito: e.target.value })}>
              <option value="">Da definire</option>
              {Object.entries(AMBITI).map(([v, e]) => (
                <option key={v} value={v}>{e}</option>
              ))}
            </Selezione>
            <Selezione etichetta="Stato iniziale" id="stato" value={incarico.stato} onChange={(e) => setIncarico({ ...incarico, stato: e.target.value })}>
              {STATI_INIZIALI.map((s) => (
                <option key={s} value={s}>{STATI_COMMESSA[s].etichetta}</option>
              ))}
            </Selezione>
            <Selezione etichetta="Responsabile" id="responsabile" value={incarico.responsabile_id} onChange={(e) => setIncarico({ ...incarico, responsabile_id: e.target.value })}>
              <option value="">Da assegnare</option>
              {dati.profili.map((p) => (
                <option key={p.id} value={p.id}>{[p.nome, p.cognome].filter(Boolean).join(" ") || p.email}</option>
              ))}
            </Selezione>
            <Campo etichetta="Data di apertura" id="apertura" type="date" value={incarico.data_apertura} onChange={(e) => setIncarico({ ...incarico, data_apertura: e.target.value })} />
            <Campo etichetta="Fine prevista" id="fine" type="date" value={incarico.data_fine_prevista} onChange={(e) => setIncarico({ ...incarico, data_fine_prevista: e.target.value })} />
            <Campo
              etichetta="Importo lavori stimato (€)"
              id="importo"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={incarico.importo_lavori_stimato}
              onChange={(e) => setIncarico({ ...incarico, importo_lavori_stimato: e.target.value })}
            />
          </div>
          {committenza === "pubblica" ? (
            <div className="grid gap-5 border-t border-linea pt-5 md:grid-cols-3">
              <Campo etichetta="CIG" id="cig" value={incarico.cig} onChange={(e) => setIncarico({ ...incarico, cig: e.target.value })} />
              <Campo etichetta="CUP" id="cup" value={incarico.cup} onChange={(e) => setIncarico({ ...incarico, cup: e.target.value })} />
              <Campo etichetta="RUP" id="rup" value={incarico.rup_nome} onChange={(e) => setIncarico({ ...incarico, rup_nome: e.target.value })} placeholder="Nome e cognome" />
            </div>
          ) : null}
          <AreaTesto
            etichetta="Descrizione"
            id="descrizione"
            value={incarico.descrizione}
            onChange={(e) => setIncarico({ ...incarico, descrizione: e.target.value })}
            placeholder="Cosa chiede il committente, vincoli noti, prime note dal sopralluogo"
          />
        </>
      ) : null}

      {passo === 3 ? (
        <>
          <SceltaFasi
            fasi={dati.fasi}
            committenza={committenza}
            tipologia={incarico.tipologia_intervento}
            scelte={codiciFasi}
            personalizzate={fasiScelte !== null}
            onCambia={setFasiScelte}
          />
          {erroreInvio ? <Messaggio tipo="errore">{erroreInvio}</Messaggio> : null}
        </>
      ) : null}
    </CorniceProcedura>
  );
}
