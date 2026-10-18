"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { Messaggio } from "@/components/campo";
import { LinkPulsante, Pulsante } from "@/components/ui";
import { aggiornaStatoPrefattibilita, aggiornaStatoPreventivo, convertiInCommessa } from "@/lib/azioni";

type Azione = { stato: string; etichetta: string };

const AZIONI_PREVENTIVO: Record<string, Azione[]> = {
  bozza: [{ stato: "inviato", etichetta: "Segna come inviato" }],
  inviato: [
    { stato: "rifiutato", etichetta: "Segna come rifiutato" },
    { stato: "bozza", etichetta: "Riporta in bozza" },
  ],
  rifiutato: [{ stato: "inviato", etichetta: "Riapri" }],
  superato: [],
  accettato: [],
};

const AZIONI_PREFATTIBILITA: Record<string, Azione[]> = {
  in_corso: [{ stato: "consegnata", etichetta: "Segna come consegnata" }],
  consegnata: [
    { stato: "archiviata", etichetta: "Archivia" },
    { stato: "in_corso", etichetta: "Riporta in lavorazione" },
  ],
  archiviata: [{ stato: "consegnata", etichetta: "Riapri" }],
  convertita: [],
};

/**
 * Azioni di una pratica: cambio di stato e trasformazione in commessa.
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
      <div className="flex flex-wrap items-center gap-2">
        {conferma ? (
          <>
            <span className="text-[0.9375rem]">
              {tipo === "preventivo"
                ? "Il preventivo risulterà accettato e nascerà la commessa con le fasi delle voci."
                : "Nascerà la commessa con le fasi tipiche dell'intervento."}
            </span>
            <Pulsante type="button" onClick={trasforma} disabled={inCorso}>
              {inCorso && chi === "commessa" ? <Loader2 className="size-4 animate-spin" /> : null}
              Conferma e crea commessa
            </Pulsante>
            <Pulsante type="button" variante="discreto" onClick={() => setConferma(false)} disabled={inCorso}>
              Annulla
            </Pulsante>
          </>
        ) : (
          <>
            <Pulsante type="button" onClick={() => setConferma(true)} disabled={inCorso}>
              <ArrowRightLeft className="size-4" strokeWidth={1.8} />
              Trasforma in commessa
            </Pulsante>
            {tipo === "prefattibilita" ? (
              <LinkPulsante href={`/nuova/preventivo?da=${id}`} variante="secondario">
                Crea preventivo
              </LinkPulsante>
            ) : null}
            {azioni.map((a) => (
              <Pulsante key={a.stato} type="button" variante="secondario" onClick={() => cambiaStato(a.stato)} disabled={inCorso}>
                {inCorso && chi === a.stato ? <Loader2 className="size-4 animate-spin" /> : null}
                {a.etichetta}
              </Pulsante>
            ))}
          </>
        )}
      </div>
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
    </div>
  );
}
