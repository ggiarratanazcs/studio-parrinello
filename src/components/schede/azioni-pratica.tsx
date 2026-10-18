"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowRightLeft,
  Check,
  FilePlus2,
  PackageCheck,
  RotateCcw,
  Send,
  Undo2,
  X,
} from "lucide-react";
import { Messaggio } from "@/components/campo";
import { Pallino, PallinoLink, type Icona, type Tinta } from "@/components/pallino";
import { aggiornaStatoPrefattibilita, aggiornaStatoPreventivo, convertiInCommessa } from "@/lib/azioni";

type Azione = { stato: string; etichetta: string; icona: Icona; tinta: Tinta };

const AZIONI_PREVENTIVO: Record<string, Azione[]> = {
  bozza: [{ stato: "inviato", etichetta: "Segna come inviato", icona: Send, tinta: "petrolio" }],
  inviato: [
    { stato: "rifiutato", etichetta: "Segna come rifiutato", icona: X, tinta: "mattone" },
    { stato: "bozza", etichetta: "Riporta in bozza", icona: Undo2, tinta: "neutra" },
  ],
  rifiutato: [{ stato: "inviato", etichetta: "Riapri", icona: RotateCcw, tinta: "neutra" }],
  superato: [],
  accettato: [],
};

const AZIONI_PREFATTIBILITA: Record<string, Azione[]> = {
  in_corso: [{ stato: "consegnata", etichetta: "Segna come consegnata", icona: PackageCheck, tinta: "salvia" }],
  consegnata: [
    { stato: "archiviata", etichetta: "Archivia", icona: Archive, tinta: "neutra" },
    { stato: "in_corso", etichetta: "Riporta in lavorazione", icona: Undo2, tinta: "neutra" },
  ],
  archiviata: [{ stato: "consegnata", etichetta: "Riapri", icona: RotateCcw, tinta: "neutra" }],
  convertita: [],
};

/**
 * Azioni di una pratica come pallini colorati con icona: cambio di stato e trasformazione in commessa.
 * Il nome dell'azione compare nel suggerimento (e sotto il pallino sui dispositivi touch).
 * Dopo la trasformazione si apre la scheda della nuova commessa.
 */
export function AzioniPratica({
  tipo,
  id,
  stato,
  convertita,
}: {
  tipo: "preventivo" | "prefattibilita";
  id: string;
  stato: string;
  convertita: boolean;
}) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [chi, setChi] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [conferma, setConferma] = useState(false);

  const azioni = (tipo === "preventivo" ? AZIONI_PREVENTIVO : AZIONI_PREFATTIBILITA)[stato] ?? [];

  function cambiaStato(nuovo: string) {
    setErrore(null);
    setChi(nuovo);
    avvia(async () => {
      const esito = tipo === "preventivo" ? await aggiornaStatoPreventivo(id, nuovo) : await aggiornaStatoPrefattibilita(id, nuovo);
      if (esito.ok) router.refresh();
      else setErrore(esito.errore);
    });
  }

  function trasforma() {
    setErrore(null);
    setChi("commessa");
    avvia(async () => {
      const esito = await convertiInCommessa(tipo, id);
      if (esito.ok) router.push(`/commesse/${esito.id}`);
      else {
        setErrore(esito.errore);
        setConferma(false);
      }
    });
  }

  if (convertita) return null;

  return (
    <div className="flex w-full flex-col gap-3">
      {conferma ? (
        <div className="flex w-fit max-w-full flex-wrap items-center gap-3 rounded-[22px] border border-linea bg-superficie py-2 pl-5 pr-2 shadow-[0_12px_28px_-16px_rgba(43,42,40,0.45)]">
          <span className="text-[0.9375rem]">
            {tipo === "preventivo"
              ? "Il preventivo risulterà accettato e nascerà la commessa con le fasi delle voci."
              : "Nascerà la commessa con le fasi tipiche dell'intervento."}
          </span>
          <div className="flex items-center gap-2">
            <Pallino
              etichetta="Conferma e crea commessa"
              icona={Check}
              tinta="bronzo"
              onClick={trasforma}
              disabled={inCorso}
              inCorso={inCorso && chi === "commessa"}
            />
            <Pallino etichetta="Annulla" icona={X} tinta="neutra" onClick={() => setConferma(false)} disabled={inCorso} />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          <Pallino
            etichetta="Trasforma in commessa"
            icona={ArrowRightLeft}
            tinta="bronzo"
            onClick={() => setConferma(true)}
            disabled={inCorso}
          />
          {tipo === "prefattibilita" ? (
            <PallinoLink href={`/nuova/preventivo?da=${id}`} etichetta="Crea preventivo" icona={FilePlus2} tinta="ardesia" />
          ) : null}
          {azioni.length ? <span aria-hidden className="mx-1 mt-2.5 h-6 w-px bg-linea-forte" /> : null}
          {azioni.map((a) => (
            <Pallino
              key={a.stato}
              etichetta={a.etichetta}
              icona={a.icona}
              tinta={a.tinta}
              onClick={() => cambiaStato(a.stato)}
              disabled={inCorso}
              inCorso={inCorso && chi === a.stato}
            />
          ))}
        </div>
      )}
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
    </div>
  );
}
