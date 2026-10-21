"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Crosshair, Loader2, MapPin, MapPinOff, Wand2 } from "lucide-react";
import { Messaggio } from "@/components/campo";
import { Pannello, Pulsante, Vuoto } from "@/components/ui";
import { posizionaImmobile, posizionaImmobiliMancanti } from "@/lib/azioni";
import type { ImmobileElenco } from "@/lib/dati";
import { cn } from "@/lib/utils";
import { Compasso } from "@/components/compasso";
import { BarraRegistro, FiltroGruppi, Intestazione, PiedeRegistro, SchedeElenco, useRegistro, type GruppoFiltro } from "@/components/registro";
import { MappaImmobili, SceltaPosizione, STATI_IMMOBILE, statoImmobile } from "./mappa";

const COLONNE = "md:grid-cols-[minmax(0,1fr)_10rem_6rem_5.5rem]";
type Chiave = "immobile" | "comune" | "zona";
const ORDINE_STATI = Object.keys(STATI_IMMOBILE);
const infoStato = (s: string) => STATI_IMMOBILE[s as keyof typeof STATI_IMMOBILE] ?? STATI_IMMOBILE.nessuno;
const GRUPPI: GruppoFiltro[] = [
  { id: "tutti", etichetta: "Tutti" },
  { id: "mappa", etichetta: "Sulla mappa", stati: [] },
  { id: "senza", etichetta: "Da posizionare", stati: [] },
];
const sullaMappa = (i: ImmobileElenco) => i.latitudine != null && i.longitudine != null;
const testo = (i: ImmobileElenco) => [
  i.denominazione,
  i.indirizzo,
  i.comune,
  i.provincia,
  i.cap,
  i.zona_urbanistica,
  ...(i.commesse ?? []).flatMap((c) => [c.codice, c.titolo]),
  ...(i.preventivi ?? []).map((p) => p.numero),
  ...(i.prefattibilita ?? []).map((p) => p.numero),
];
const valore = (i: ImmobileElenco, k: Chiave): unknown => (k === "immobile" ? i.denominazione ?? i.indirizzo : k === "comune" ? i.comune : i.zona_urbanistica);
// Il filtro è "scheda|stato": la scheda guarda la posizione sulla mappa, il pallino lo stato dell'immobile
const filtro = (i: ImmobileElenco, scelto: string) => {
  const [g] = scelto.split("|");
  if (g === "mappa" && !sullaMappa(i)) return false;
  if (g === "senza" && sullaMappa(i)) return false;
  const stato = scelto.split("|")[1];
  return !stato || statoImmobile(i) === stato;
};

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
      <Pannello className="relative overflow-hidden">
        <MappaImmobili immobili={immobili} evidenzia={evidenzia} />
        {inCorso ? (
          // Posizionamento automatico: qualche secondo per indirizzo, il compasso lavora sulla mappa
          <div className="absolute inset-x-0 top-0 z-[500] grid h-[300px] w-full place-items-center md:h-[380px] bg-sfondo/80 backdrop-blur-[2px]">
            <Compasso className="w-36" didascalia="Cerco gli indirizzi" />
          </div>
        ) : null}
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
          <ElencoImmobili immobili={immobili}>
            {(i) => (
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
            )}
          </ElencoImmobili>
        )}
      </Pannello>
    </div>
  );
}

/** Registro degli immobili: ricerca, schede (tutti, sulla mappa, da posizionare), pallini per stato, ordinamento. */
function ElencoImmobili({ immobili, children }: { immobili: ImmobileElenco[]; children: (i: ImmobileElenco) => ReactNode }) {
  const r = useRegistro<ImmobileElenco, Chiave>({ righe: immobili, testo, valore, filtro, iniziale: { chiave: "comune", verso: "asc" }, filtroIniziale: "tutti|" });
  // Conteggi delle schede calcolati sulla posizione, non sullo stato
  const gruppi = GRUPPI;
  const statiRighe = immobili.map((i) => statoImmobile(i) as string);
  const intestazione = (chiave: Chiave, nome: string) => (
    <Intestazione chiave={chiave} ordine={r.ordine} onOrdina={r.ordina}>
      {nome}
    </Intestazione>
  );
  const nMappa = immobili.filter(sullaMappa).length;
  return (
    <>
      <BarraRegistro cerca={r.cerca} onCerca={r.setCerca} segnaposto="Cerca">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-5">
          <SchedeElenco
            nome="Posizione"
            voci={gruppi.map((g) => ({
              id: g.id,
              etichetta: g.etichetta,
              numero: g.id === "tutti" ? immobili.length : g.id === "mappa" ? nMappa : immobili.length - nMappa,
            }))}
            scelta={r.scelto.split("|")[0]}
            onScegli={(id) => r.setScelto(`${id}|${r.scelto.split("|")[1] ?? ""}`)}
          />
          <span aria-hidden className="hidden h-5 w-px bg-linea-forte lg:block" />
          <FiltroGruppi
            senzaSchede
            gruppi={[]}
            ordine={ORDINE_STATI}
            info={infoStato}
            stati={statiRighe}
            scelto={r.scelto}
            onScegli={r.setScelto}
          />
        </div>
      </BarraRegistro>
      <div role="table" aria-label="Immobili">
        <div role="row" className={`elenco-intestazione etichetta hidden border-b border-linea py-3 pl-12 pr-6 md:grid ${COLONNE} md:gap-x-4`}>
          {intestazione("immobile", "Immobile")}
          {intestazione("comune", "Comune")}
          {intestazione("zona", "Zona")}
          <span role="columnheader" className="sr-only">Mappa</span>
        </div>
        <ul role="rowgroup" className="divide-y divide-linea">
          {r.visibili.map(children)}
          {r.visibili.length === 0 ? <li className="px-6 py-10 text-center text-[0.9375rem] text-tenue">Nessun immobile corrisponde alla ricerca o al filtro.</li> : null}
        </ul>
      </div>
      <PiedeRegistro visibili={r.visibili.length} totali={immobili.length} nome={["immobile", "immobili"]} />
    </>
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
      <div
        role="row"
        // Clic sulla riga: apre la scheda dell'immobile (i pulsanti della mappa restano a sé)
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, a")) return;
          router.push(`/immobili/${i.id}`);
        }}
        className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-4 transition-colors hover:bg-superficie-2/50 md:px-6 ${COLONNE}`}
      >
        <span role="cell" className="flex min-w-0 items-center gap-4">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: stato.colore }} data-suggerimento={stato.etichetta} />
          <span className="min-w-0">
            <Link href={`/immobili/${i.id}`} className="block truncate font-medium hover:underline">
              {i.denominazione ?? i.indirizzo}
            </Link>
            <span className="block truncate text-sm text-tenue">
              {[i.indirizzo, pratiche.join(" · ")].filter(Boolean).join("  —  ")}
              <span className="md:hidden">{i.comune ? ` · ${i.comune}` : ""}</span>
            </span>
          </span>
        </span>
        <span role="cell" className="hidden truncate text-sm text-inchiostro-2 md:block">{i.comune ?? "—"}</span>
        <span role="cell" className="numeri hidden text-sm text-inchiostro-2 md:block">{i.zona_urbanistica ?? "—"}</span>
        <span role="cell" className="flex items-center justify-end gap-1">
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
        </span>
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
