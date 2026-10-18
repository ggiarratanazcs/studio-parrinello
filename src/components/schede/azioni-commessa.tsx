"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Flag, Pause, Play, RotateCcw, X } from "lucide-react";
import { Messaggio } from "@/components/campo";
import { Pallino, type Icona, type Tinta } from "@/components/pallino";
import { aggiornaStatoCommessa } from "@/lib/azioni";

type Azione = { stato: string; etichetta: string; icona: Icona; tinta: Tinta; conferma?: string };

const AVVIA: Azione = { stato: "attiva", etichetta: "Avvia la commessa", icona: Play, tinta: "salvia" };
const ANNULLA: Azione = {
  stato: "annullata",
  etichetta: "Annulla la commessa",
  icona: Ban,
  tinta: "mattone",
  conferma: "La commessa risulterà annullata e uscirà dalle commesse aperte.",
};

const AZIONI: Record<string, Azione[]> = {
  contatto: [AVVIA],
  prefattibilita: [AVVIA],
  preventivo: [AVVIA],
  attiva: [
    {
      stato: "conclusa",
      etichetta: "Concludi la commessa",
      icona: Flag,
      tinta: "bronzo",
      conferma: "La commessa risulterà conclusa con la data di oggi.",
    },
    { stato: "sospesa", etichetta: "Sospendi", icona: Pause, tinta: "petrolio" },
    ANNULLA,
  ],
  sospesa: [{ stato: "attiva", etichetta: "Riprendi", icona: Play, tinta: "salvia" }, ANNULLA],
  conclusa: [{ stato: "attiva", etichetta: "Riapri", icona: RotateCcw, tinta: "neutra" }],
  annullata: [{ stato: "attiva", etichetta: "Riapri", icona: RotateCcw, tinta: "neutra" }],
  persa: [{ stato: "attiva", etichetta: "Riapri", icona: RotateCcw, tinta: "neutra" }],
};

/** Cambio di stato della commessa con i pallini; chiusura e annullamento chiedono conferma. */
export function AzioniCommessa({ id, stato }: { id: string; stato: string }) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [chi, setChi] = useState<string | null>(null);
  const [daConfermare, setDaConfermare] = useState<Azione | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const azioni = AZIONI[stato] ?? [];
  if (!azioni.length) return null;

  function esegui(a: Azione) {
    setErrore(null);
    setChi(a.stato);
    avvia(async () => {
      const esito = await aggiornaStatoCommessa(id, a.stato);
      if (esito.ok) {
        setDaConfermare(null);
        router.refresh();
      } else setErrore(esito.errore);
    });
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {daConfermare ? (
        <div className="flex w-fit max-w-full flex-wrap items-center gap-3 rounded-[22px] border border-linea bg-superficie py-2 pl-5 pr-2 shadow-[0_12px_28px_-16px_rgba(43,42,40,0.45)]">
          <span className="text-[0.9375rem]">{daConfermare.conferma}</span>
          <div className="flex items-center gap-2">
            <Pallino
              etichetta="Conferma"
              icona={Check}
              tinta={daConfermare.tinta}
              onClick={() => esegui(daConfermare)}
              disabled={inCorso}
              inCorso={inCorso && chi === daConfermare.stato}
            />
            <Pallino etichetta="Annulla" icona={X} tinta="neutra" onClick={() => setDaConfermare(null)} disabled={inCorso} />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          {azioni.map((a) => (
            <Pallino
              key={a.stato}
              etichetta={a.etichetta}
              icona={a.icona}
              tinta={a.tinta}
              onClick={() => (a.conferma ? setDaConfermare(a) : esegui(a))}
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
