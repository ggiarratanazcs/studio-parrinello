"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, Loader2, MapPin, MapPinOff, Wand2 } from "lucide-react";
import { Messaggio } from "@/components/campo";
import { Pannello, Pulsante, Vuoto } from "@/components/ui";
import { posizionaImmobile, posizionaImmobiliMancanti } from "@/lib/azioni";
import type { ImmobileElenco } from "@/lib/dati";
import { cn } from "@/lib/utils";
import { MappaImmobili, SceltaPosizione, STATI_IMMOBILE, statoImmobile } from "./mappa";

/** Mappa degli immobili in alto e, sotto, l'elenco con il posizionamento sulla mappa. */
export function ImmobiliConMappa({ immobili }: { immobili: ImmobileElenco[] }) {
  const [evidenzia, setEvidenzia] = useState<string | null>(null);
  const [inModifica, setInModifica] = useState<string | null>(null);
  const posizionati = immobili.filter((i) => i.latitudine != null && i.longitudine != null).length;
  const mancanti = immobili.length - posizionati;
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [esito, setEsito] = useState<string | null>(null);

  function posizionaTutti() {
    setEsito(null);
    avvia(async () => {
      const r = await posizionaImmobiliMancanti();
      if (!r.ok) setEsito(r.errore);
      else {
        setEsito(
          r.trovati === 0
            ? "Nessun indirizzo trovato automaticamente: usa il mirino per posizionarli a mano."
            : `${r.trovati} ${r.trovati === 1 ? "immobile posizionato" : "immobili posizionati"}${r.restanti ? `, ${r.restanti} ancora da posizionare` : ""}.`,
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Pannello className="overflow-hidden">
        <MappaImmobili immobili={immobili} evidenzia={evidenzia} />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-linea px-5 py-3 text-sm md:px-6">
          {Object.entries(STATI_IMMOBILE).map(([k, s]) => (
            <span key={k} className="inline-flex items-center gap-2 text-inchiostro-2">
              <span className="size-2.5 rounded-full" style={{ background: s.colore, boxShadow: `0 0 0 2px #fff, 0 2px 6px -2px ${s.colore}` }} />
              {s.etichetta}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-3 text-tenue">
            {posizionati} di {immobili.length} sulla mappa
            {mancanti > 0 ? (
              <Pulsante type="button" variante="secondario" className="h-9 rounded-full px-3.5 text-sm" onClick={posizionaTutti} disabled={inCorso}>
                {inCorso ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" strokeWidth={1.8} />}
                {inCorso ? "Cerco gli indirizzi…" : `Posiziona in automatico (${mancanti})`}
              </Pulsante>
            ) : null}
          </span>
        </div>
        {esito ? <p className="border-t border-linea px-5 py-2.5 text-sm text-inchiostro-2 md:px-6">{esito}</p> : null}
      </Pannello>

      <Pannello>
        {immobili.length === 0 ? (
          <Vuoto
            titolo="Nessun immobile registrato"
            testo="Gli immobili si aggiungono creando preventivi, pre-fattibilità o commesse. Poi qui li posizioni sulla mappa."
          />
        ) : (
          <ul className="divide-y divide-linea">
            {immobili.map((i) => (
              <RigaImmobile
                key={i.id}
                immobile={i}
                aperta={inModifica === i.id}
                onApri={() => setInModifica(inModifica === i.id ? null : i.id)}
                onChiudi={() => setInModifica(null)}
                onMostra={() => {
                  setEvidenzia(null);
                  requestAnimationFrame(() => setEvidenzia(i.id));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            ))}
          </ul>
        )}
      </Pannello>
    </div>
  );
}

function RigaImmobile({
  immobile: i,
  aperta,
  onApri,
  onChiudi,
  onMostra,
}: {
  immobile: ImmobileElenco;
  aperta: boolean;
  onApri: () => void;
  onChiudi: () => void;
  onMostra: () => void;
}) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const posizione = i.latitudine != null && i.longitudine != null ? { lat: Number(i.latitudine), lng: Number(i.longitudine) } : null;
  const [scelta, setScelta] = useState(posizione);
  const stato = STATI_IMMOBILE[statoImmobile(i)];
  const pratiche = [...(i.commesse ?? []).map((c) => c.codice), ...(i.preventivi ?? []).map((p) => p.numero), ...(i.prefattibilita ?? []).map((p) => p.numero)].filter(Boolean);

  function salva(p: { lat: number; lng: number } | null) {
    setErrore(null);
    avvia(async () => {
      const esito = await posizionaImmobile(i.id, p);
      if (esito.ok) {
        onChiudi();
        router.refresh();
      } else setErrore(esito.errore);
    });
  }

  return (
    <li className={cn(aperta && "bg-superficie-2/60")}>
      <div className="flex items-center gap-4 px-5 py-4 md:px-6">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: stato.colore }} data-suggerimento={stato.etichetta} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{i.denominazione ?? i.indirizzo}</span>
          <span className="block truncate text-sm text-tenue">
            {[[i.indirizzo, i.comune].filter(Boolean).join(", "), pratiche.join(" · ")].filter(Boolean).join("  —  ")}
          </span>
        </span>
        <span className="etichetta hidden shrink-0 md:inline">{i.zona_urbanistica ? `Zona ${i.zona_urbanistica}` : ""}</span>
        {posizione ? (
          <button
            type="button"
            onClick={onMostra}
            aria-label="Mostra sulla mappa"
            data-suggerimento="Mostra sulla mappa"
            className="grid size-9 shrink-0 place-items-center rounded-full text-accento hover:bg-superficie-2"
          >
            <MapPin className="size-[18px]" strokeWidth={1.8} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onApri}
          aria-label={posizione ? "Correggi la posizione" : "Posiziona sulla mappa"}
          data-suggerimento={posizione ? "Correggi la posizione" : "Posiziona sulla mappa"}
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full hover:bg-superficie-2",
            posizione ? "text-tenue" : "text-[color:var(--stato-sospesa)]",
          )}
        >
          {posizione ? <Crosshair className="size-[18px]" strokeWidth={1.8} /> : <MapPinOff className="size-[18px]" strokeWidth={1.8} />}
        </button>
      </div>

      {aperta ? (
        <div className="grid gap-3 px-5 pb-5 md:px-6">
          <SceltaPosizione
            iniziale={posizione}
            indirizzo={[i.indirizzo, i.cap, i.comune, i.provincia].filter(Boolean).join(", ")}
            onCambia={setScelta}
          />
          {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
          <div className="flex flex-wrap justify-between gap-2">
            {posizione ? (
              <Pulsante type="button" variante="discreto" className="text-[color:var(--stato-sospesa)]" disabled={inCorso} onClick={() => salva(null)}>
                Togli dalla mappa
              </Pulsante>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Pulsante type="button" variante="discreto" onClick={onChiudi} disabled={inCorso}>
                Annulla
              </Pulsante>
              <Pulsante type="button" disabled={inCorso || !scelta} onClick={() => salva(scelta)}>
                {inCorso ? <Loader2 className="size-4 animate-spin" /> : null}
                Salva la posizione
              </Pulsante>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}
