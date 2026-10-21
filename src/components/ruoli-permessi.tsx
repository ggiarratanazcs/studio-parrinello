"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Messaggio } from "@/components/campo";
import { ripristinaPermessiUtente, salvaPermessoRuolo, salvaPermessoUtente } from "@/lib/azioni-studio";
import {
  GRUPPI_PERMESSI,
  MASSIMO,
  RUOLI_CONFIGURABILI,
  SCALE,
  type MappaPermessi,
  type RuoloConfigurabile,
  type VocePermesso,
} from "@/lib/permessi-catalogo";
import { cn } from "@/lib/utils";

const NOMI_RUOLO: Record<RuoloConfigurabile, string> = { architetto: "Architetto", collaboratore: "Collaboratore" };

/** Livello di una voce: un clic passa al successivo, il nome resta sempre leggibile. */
function Livello({
  voce,
  valore,
  onCambia,
  disabilitato,
  personale,
  etichetta,
}: {
  voce: VocePermesso;
  valore: number;
  onCambia?: (nuovo: number) => void;
  disabilitato?: boolean;
  personale?: boolean;
  etichetta: string;
}) {
  const scala = SCALE[voce.scala];
  const massimo = MASSIMO[voce.scala];
  const nome = scala[valore] ?? scala[0];
  if (!onCambia) return <span className="text-[0.8125rem] text-tenue">{nome}</span>;
  return (
    <button
      type="button"
      onClick={() => onCambia((valore + 1) % (massimo + 1))}
      disabled={disabilitato}
      aria-label={`${etichetta}: ${nome}. Cambia livello`}
      data-suggerimento="Clic per cambiare"
      className={cn(
        "inline-flex h-7 max-w-full items-center gap-1.5 truncate rounded-piccolo border px-2.5 text-[0.8125rem] transition-colors disabled:opacity-60",
        valore === 0 && "border-linea text-tenue hover:border-linea-forte",
        valore > 0 && valore < massimo && "border-linea-forte text-inchiostro hover:bg-superficie-2",
        valore === massimo && "border-accento/35 bg-accento/10 text-accento hover:bg-accento/15",
        personale && "ring-2 ring-accento/25 ring-offset-1 ring-offset-superficie",
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full border border-current", valore > 0 && "bg-current")} />
      {nome}
    </button>
  );
}

/* ── Matrice dei ruoli ────────────────────────────────────────────────── */

export function MatricePermessi({ valori }: { valori: Record<RuoloConfigurabile, MappaPermessi> }) {
  const router = useRouter();
  const [mappa, setMappa] = useState(valori);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  function cambia(ruolo: RuoloConfigurabile, chiave: string, livello: number) {
    const prima = mappa;
    setErrore(null);
    setMappa((m) => ({ ...m, [ruolo]: { ...m[ruolo], [chiave]: livello } }));
    avvia(async () => {
      const r = await salvaPermessoRuolo(ruolo, chiave, livello);
      if (!r.ok) {
        setMappa(prima);
        setErrore(r.errore);
      } else router.refresh();
    });
  }

  return (
    <div className="px-5 pb-5 pt-2 md:px-6">
      {GRUPPI_PERMESSI.map((g) => (
        <div key={g.titolo} className="mt-4">
          <table className="w-full table-fixed border-collapse text-[0.875rem]">
            <colgroup>
              <col />
              <col className="w-[5.5rem] md:w-28" />
              {RUOLI_CONFIGURABILI.map((r) => (
                <col key={r} className="w-[7.5rem] md:w-40" />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-linea-forte text-left">
                <th className="py-2.5 pr-3 font-medium">
                  {g.titolo}
                  <span className="block text-[0.75rem] font-normal text-tenue">{g.descrizione}</span>
                </th>
                <th className="py-2.5 pr-2 align-bottom text-[0.75rem] font-normal text-tenue">Titolare</th>
                {RUOLI_CONFIGURABILI.map((r) => (
                  <th key={r} className="py-2.5 pr-2 align-bottom text-[0.75rem] font-normal text-tenue">
                    {NOMI_RUOLO[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {g.voci.map((v) => (
                <tr key={v.chiave} className="border-b border-linea last:border-b-0">
                  <td className="py-2 pr-3 align-middle">
                    {v.etichetta}
                    {v.nota ? <span className="block text-[0.75rem] text-tenue">{v.nota}</span> : null}
                  </td>
                  <td className="py-2 pr-2">
                    <span className="text-[0.8125rem] text-tenue">{SCALE[v.scala][MASSIMO[v.scala]]}</span>
                  </td>
                  {RUOLI_CONFIGURABILI.map((r) => (
                    <td key={r} className="py-2 pr-2">
                      <Livello
                        voce={v}
                        valore={mappa[r][v.chiave] ?? 0}
                        etichetta={`${NOMI_RUOLO[r]}, ${v.etichetta}`}
                        disabilitato={inCorso}
                        onCambia={(n) => cambia(r, v.chiave, n)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {errore ? (
        <div className="mt-4">
          <Messaggio tipo="errore">{errore}</Messaggio>
        </div>
      ) : null}
      <p className="mt-5 text-sm text-tenue">
        Le modifiche valgono subito per tutti gli utenti del ruolo, salvo le eccezioni personali impostate in Utenti dello studio. Il titolare ha sempre
        accesso completo.
      </p>
    </div>
  );
}

/* ── Eccezioni sul singolo utente ─────────────────────────────────────── */

export function PermessiPersonali({
  id,
  nome,
  ruolo,
  delRuolo,
  personali,
}: {
  id: string;
  nome: string;
  ruolo: RuoloConfigurabile;
  delRuolo: MappaPermessi;
  personali: MappaPermessi;
}) {
  const router = useRouter();
  const [proprie, setProprie] = useState(personali);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();
  const numero = Object.keys(proprie).length;

  function esegui(nuove: MappaPermessi, azione: () => Promise<{ ok: true } | { ok: false; errore: string }>) {
    const prima = proprie;
    setErrore(null);
    setProprie(nuove);
    avvia(async () => {
      const r = await azione();
      if (!r.ok) {
        setProprie(prima);
        setErrore(r.errore);
      } else router.refresh();
    });
  }

  function cambia(chiave: string, livello: number) {
    // Se il nuovo valore coincide con quello del ruolo, l'eccezione non serve più
    const uguale = (delRuolo[chiave] ?? 0) === livello;
    const nuove = { ...proprie };
    if (uguale) delete nuove[chiave];
    else nuove[chiave] = livello;
    esegui(nuove, () => salvaPermessoUtente(id, chiave, uguale ? null : livello));
  }

  function togli(chiave: string) {
    const nuove = { ...proprie };
    delete nuove[chiave];
    esegui(nuove, () => salvaPermessoUtente(id, chiave, null));
  }

  return (
    <div className="rounded-medio border border-linea bg-superficie-2/40 px-4 pb-4 pt-1">
      {GRUPPI_PERMESSI.map((g) => (
        <div key={g.titolo} className="mt-3">
          <p className="etichetta mb-1">{g.titolo}</p>
          <ul className="divide-y divide-linea">
            {g.voci.map((v) => {
              const personale = v.chiave in proprie;
              const valore = personale ? proprie[v.chiave] : (delRuolo[v.chiave] ?? 0);
              return (
                <li key={v.chiave} className="flex items-center gap-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[0.875rem]">{v.etichetta}</span>
                  {personale ? (
                    <button
                      type="button"
                      onClick={() => togli(v.chiave)}
                      disabled={inCorso}
                      className="inline-flex items-center gap-1 text-[0.75rem] text-tenue hover:text-inchiostro"
                      data-suggerimento={`Torna al valore del ruolo: ${SCALE[v.scala][delRuolo[v.chiave] ?? 0]}`}
                    >
                      <RotateCcw className="size-3" strokeWidth={2} />
                      <span className="hidden sm:inline">ruolo</span>
                    </button>
                  ) : null}
                  <span className="w-[8.5rem] shrink-0">
                    <Livello
                      voce={v}
                      valore={valore}
                      personale={personale}
                      etichetta={`${nome}, ${v.etichetta}`}
                      disabilitato={inCorso}
                      onCambia={(n) => cambia(v.chiave, n)}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {errore ? (
        <div className="mt-3">
          <Messaggio tipo="errore">{errore}</Messaggio>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[0.8125rem] text-tenue">
        <span>
          Il resto segue il ruolo {NOMI_RUOLO[ruolo]}. Le voci cerchiate sono personali.
        </span>
        {numero ? (
          <button
            type="button"
            disabled={inCorso}
            onClick={() => esegui({}, () => ripristinaPermessiUtente(id))}
            className="text-accento hover:underline disabled:opacity-50"
          >
            Ripristina ruolo
          </button>
        ) : null}
      </div>
    </div>
  );
}
