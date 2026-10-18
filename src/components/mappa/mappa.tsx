"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type * as L from "leaflet";
import type { ImmobileElenco } from "@/lib/dati";

/** Centro predefinito: Siracusa. */
export const SIRACUSA: [number, number] = [37.0755, 15.2866];

/** Stato di un immobile per il colore del segnaposto. */
export const STATI_IMMOBILE = {
  in_corso: { etichetta: "Commessa in corso", colore: "#5c7a4c" },
  pratica: { etichetta: "Preventivo / pre-fattibilità", colore: "#4f6274" },
  conclusa: { etichetta: "Lavoro concluso", colore: "#8a5a2b" },
  nessuno: { etichetta: "Senza pratiche", colore: "#9a948a" },
} as const;
export type StatoImmobile = keyof typeof STATI_IMMOBILE;

export function statoImmobile(i: ImmobileElenco): StatoImmobile {
  const commesse = i.commesse ?? [];
  if (commesse.some((c) => ["attiva", "sospesa", "contatto", "prefattibilita", "preventivo"].includes(c.stato))) return "in_corso";
  if (commesse.length) return "conclusa";
  const pratiche = [...(i.preventivi ?? []), ...(i.prefattibilita ?? [])];
  if (pratiche.length) return "pratica";
  return "nessuno";
}

const escape = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Carica Leaflet solo nel browser (usa window). */
function useLeaflet() {
  const [leaflet, setLeaflet] = useState<typeof L | null>(null);
  useEffect(() => {
    let attivo = true;
    import("leaflet").then((m) => attivo && setLeaflet(m.default ?? m));
    return () => {
      attivo = false;
    };
  }, []);
  return leaflet;
}

function segnaposto(leaflet: typeof L, colore: string, grande = false) {
  const d = grande ? 26 : 18;
  return leaflet.divIcon({
    className: "segnaposto-studio",
    html: `<span style="--c:${colore};width:${d}px;height:${d}px"></span>`,
    iconSize: [d, d],
    iconAnchor: [d / 2, d / 2],
    popupAnchor: [0, -d / 2],
  });
}

function sfondo(leaflet: typeof L, mappa: L.Map) {
  leaflet
    .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
    .addTo(mappa);
}

/**
 * Mappa degli immobili dello studio: un segnaposto colorato per stato su ciascun immobile
 * posizionato; il riquadro si adatta ai segnaposto. `evidenzia` porta la mappa su un immobile.
 */
export function MappaImmobili({ immobili, evidenzia }: { immobili: ImmobileElenco[]; evidenzia?: string | null }) {
  const leaflet = useLeaflet();
  const contenitore = useRef<HTMLDivElement>(null);
  const mappa = useRef<L.Map | null>(null);
  const strato = useRef<L.LayerGroup | null>(null);
  const segni = useRef(new Map<string, L.Marker>());

  // Crea la mappa una volta
  useEffect(() => {
    if (!leaflet || !contenitore.current || mappa.current) return;
    const m = leaflet.map(contenitore.current, { zoomControl: true, scrollWheelZoom: false }).setView(SIRACUSA, 11);
    sfondo(leaflet, m);
    strato.current = leaflet.layerGroup().addTo(m);
    mappa.current = m;
    return () => {
      m.remove();
      mappa.current = null;
    };
  }, [leaflet]);

  // Aggiorna i segnaposto
  useEffect(() => {
    const m = mappa.current;
    if (!leaflet || !m || !strato.current) return;
    strato.current.clearLayers();
    segni.current.clear();
    const punti: [number, number][] = [];
    for (const i of immobili) {
      if (i.latitudine == null || i.longitudine == null) continue;
      const pos: [number, number] = [Number(i.latitudine), Number(i.longitudine)];
      const stato = STATI_IMMOBILE[statoImmobile(i)];
      const commesse = (i.commesse ?? [])
        .map((c) => `<a href="/commesse/${c.id}">${escape(c.codice ?? "")} · ${escape(c.titolo)}</a>`)
        .join("<br>");
      const popup = `<strong>${escape(i.denominazione ?? i.indirizzo)}</strong><br><span class="tenue">${escape(
        [i.indirizzo, i.comune].filter(Boolean).join(", "),
      )}</span><br><span style="color:${stato.colore}">● ${stato.etichetta}</span>${commesse ? `<div class="commesse">${commesse}</div>` : ""}`;
      const segno = leaflet.marker(pos, { icon: segnaposto(leaflet, stato.colore), title: i.denominazione ?? i.indirizzo }).bindPopup(popup);
      segno.addTo(strato.current);
      segni.current.set(i.id, segno);
      punti.push(pos);
    }
    if (punti.length === 1) m.setView(punti[0], 15);
    else if (punti.length > 1) m.fitBounds(leaflet.latLngBounds(punti), { padding: [40, 40], maxZoom: 15 });
  }, [leaflet, immobili]);

  // Porta la mappa sull'immobile scelto nell'elenco
  useEffect(() => {
    if (!evidenzia || !mappa.current) return;
    const segno = segni.current.get(evidenzia);
    if (segno) {
      mappa.current.flyTo(segno.getLatLng(), 16, { duration: 0.6 });
      segno.openPopup();
    }
  }, [evidenzia]);

  return <div ref={contenitore} className="mappa-studio h-[300px] w-full md:h-[380px]" aria-label="Mappa degli immobili" />;
}

/**
 * Scelta della posizione: cerca l'indirizzo, poi il segnaposto si sposta trascinandolo
 * o cliccando sulla mappa; "Sono qui" usa il GPS del telefono.
 */
export function SceltaPosizione({
  iniziale,
  indirizzo,
  onCambia,
}: {
  iniziale: { lat: number; lng: number } | null;
  indirizzo: string;
  onCambia: (p: { lat: number; lng: number }) => void;
}) {
  const leaflet = useLeaflet();
  const contenitore = useRef<HTMLDivElement>(null);
  const mappa = useRef<L.Map | null>(null);
  const segno = useRef<L.Marker | null>(null);
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [cercando, setCercando] = useState(false);
  const cambia = useRef(onCambia);
  useEffect(() => {
    cambia.current = onCambia;
  }, [onCambia]);

  function metti(p: { lat: number; lng: number }, zoom?: number) {
    const m = mappa.current;
    if (!leaflet || !m) return;
    if (!segno.current) {
      segno.current = leaflet.marker([p.lat, p.lng], { draggable: true, icon: segnaposto(leaflet, "#8a5a2b", true) }).addTo(m);
      segno.current.on("dragend", () => {
        const ll = segno.current!.getLatLng();
        cambia.current({ lat: ll.lat, lng: ll.lng });
      });
    } else segno.current.setLatLng([p.lat, p.lng]);
    m.setView([p.lat, p.lng], zoom ?? Math.max(m.getZoom(), 17));
    cambia.current(p);
  }

  async function cerca() {
    setMessaggio(null);
    setCercando(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&q=${encodeURIComponent(indirizzo)}`;
      const r = await fetch(url, { headers: { "Accept-Language": "it" } });
      const dati = (await r.json()) as { lat: string; lon: string }[];
      if (dati[0]) metti({ lat: Number(dati[0].lat), lng: Number(dati[0].lon) }, 18);
      else setMessaggio("Indirizzo non trovato: sposta il segnaposto a mano cliccando sulla mappa.");
    } catch {
      setMessaggio("Ricerca non riuscita: clicca sulla mappa per posizionare l'immobile.");
    } finally {
      setCercando(false);
    }
  }

  function gps() {
    setMessaggio(null);
    if (!navigator.geolocation) return setMessaggio("Il GPS non è disponibile su questo dispositivo.");
    navigator.geolocation.getCurrentPosition(
      (p) => metti({ lat: p.coords.latitude, lng: p.coords.longitude }, 18),
      () => setMessaggio("Posizione non disponibile: controlla i permessi di localizzazione."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  useEffect(() => {
    if (!leaflet || !contenitore.current || mappa.current) return;
    const m = leaflet.map(contenitore.current).setView(iniziale ? [iniziale.lat, iniziale.lng] : SIRACUSA, iniziale ? 17 : 12);
    sfondo(leaflet, m);
    mappa.current = m;
    m.on("click", (e: L.LeafletMouseEvent) => metti({ lat: e.latlng.lat, lng: e.latlng.lng }));
    if (iniziale) metti(iniziale, 17);
    else setTimeout(() => void cerca(), 0);
    return () => {
      m.remove();
      mappa.current = null;
      segno.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaflet]);

  return (
    <div className="flex flex-col gap-2">
      <div ref={contenitore} className="mappa-studio h-[280px] w-full overflow-hidden rounded-m border border-linea" />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={cerca} disabled={cercando} className="rounded-full border border-linea-forte bg-superficie px-3 py-1.5 hover:bg-superficie-2">
          {cercando ? "Cerco…" : "Cerca l'indirizzo"}
        </button>
        <button type="button" onClick={gps} className="rounded-full border border-linea-forte bg-superficie px-3 py-1.5 hover:bg-superficie-2">
          Sono qui (GPS)
        </button>
        <span className="text-tenue">Trascina il segnaposto o clicca sulla mappa per correggere.</span>
      </div>
      {messaggio ? <p className="text-sm text-[color:var(--stato-sospesa)]">{messaggio}</p> : null}
    </div>
  );
}
