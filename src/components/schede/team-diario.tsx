"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck2,
  Footprints,
  Gavel,
  Loader2,
  Mail,
  NotebookPen,
  Phone,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AreaTesto, Campo, Messaggio, Selezione } from "@/components/campo";
import type { Icona } from "@/components/pallino";
import { Pulsante } from "@/components/ui";
import { aggiungiMembro, aggiungiNota, eliminaNota, rimuoviMembro } from "@/lib/azioni";
import type { Commessa } from "@/lib/dati";
import { cn } from "@/lib/utils";

type Membro = NonNullable<Commessa["team"]>[number];
type Nota = NonNullable<Commessa["diario"]>[number];
type Profilo = Commessa["profiliStudio"][number];

const RUOLI_COMMESSA = [
  "Progettista",
  "Direttore dei lavori",
  "Coordinatore sicurezza (CSP)",
  "Coordinatore sicurezza (CSE)",
  "Disegnatore",
  "Rilievo",
  "Modellazione BIM",
  "Pratiche edilizie",
];

/* ── Team di commessa ─────────────────────────────────────────────────── */

export function TeamCommessa({
  commessaId,
  team,
  profili,
  modificabile = true,
}: {
  commessaId: string;
  team: Membro[];
  profili: Profilo[];
  /** Permesso "Team" modificabile: aggiunge e toglie persone */
  modificabile?: boolean;
}) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [aperto, setAperto] = useState(false);
  const [persona, setPersona] = useState("");
  const [ruolo, setRuolo] = useState("");
  const [errore, setErrore] = useState<string | null>(null);

  const liberi = profili.filter((p) => !team.some((m) => m.profilo_id === p.id));

  function esegui(azione: () => Promise<{ ok: boolean; errore?: string }>, dopo?: () => void) {
    setErrore(null);
    avvia(async () => {
      const esito = await azione();
      if (esito.ok) {
        dopo?.();
        router.refresh();
      } else setErrore(esito.errore ?? "Operazione non riuscita.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {team.length === 0 ? <p className="text-[0.9375rem] text-tenue">Nessuno assegnato.</p> : null}
      <ul className="flex flex-col gap-2">
        {team.map((m) => (
          <li key={m.profilo_id} className="group flex items-center gap-3">
            <span className="pallino-tessera grid size-9 shrink-0 place-items-center rounded-full text-[0.75rem] font-medium">
              {m.profilo?.iniziali ?? m.profilo?.nome?.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9375rem]">
                {m.profilo?.nome} {m.profilo?.cognome}
              </span>
              {m.ruolo_commessa ? <span className="block truncate text-sm text-tenue">{m.ruolo_commessa}</span> : null}
            </span>
            {modificabile ? (
            <button
              type="button"
              onClick={() => esegui(() => rimuoviMembro(commessaId, m.profilo_id))}
              disabled={inCorso}
              aria-label={`Togli ${m.profilo?.nome} dal team`}
              data-suggerimento="Togli dal team"
              className="grid size-8 place-items-center rounded-full text-tenue opacity-60 transition hover:bg-superficie-2 hover:text-inchiostro group-hover:opacity-100"
            >
              <X className="size-4" strokeWidth={1.8} />
            </button>
            ) : null}
          </li>
        ))}
      </ul>

      {!modificabile ? null : aperto ? (
        <div className="grid gap-3 rounded-medio bg-superficie-2/70 p-3">
          <Selezione etichetta="Persona" id={`team-p-${commessaId}`} value={persona} onChange={(e) => setPersona(e.target.value)}>
            <option value="">Scegli…</option>
            {liberi.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} {p.cognome}
              </option>
            ))}
          </Selezione>
          <Campo
            etichetta="Ruolo nella commessa"
            id={`team-r-${commessaId}`}
            list={`ruoli-${commessaId}`}
            value={ruolo}
            onChange={(e) => setRuolo(e.target.value)}
            placeholder="es. Direttore dei lavori"
          />
          <datalist id={`ruoli-${commessaId}`}>
            {RUOLI_COMMESSA.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          <div className="flex justify-end gap-2">
            <Pulsante type="button" variante="discreto" onClick={() => setAperto(false)} disabled={inCorso}>
              Annulla
            </Pulsante>
            <Pulsante
              type="button"
              disabled={inCorso || !persona}
              onClick={() =>
                esegui(
                  () => aggiungiMembro(commessaId, persona, ruolo),
                  () => {
                    setAperto(false);
                    setPersona("");
                    setRuolo("");
                  },
                )
              }
            >
              {inCorso ? <Loader2 className="size-4 animate-spin" /> : null}
              Aggiungi
            </Pulsante>
          </div>
        </div>
      ) : liberi.length ? (
        <Pulsante type="button" variante="discreto" className="-ml-3 w-fit" onClick={() => setAperto(true)}>
          <Plus className="size-4" strokeWidth={2} />
          Aggiungi al team
        </Pulsante>
      ) : null}
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
    </div>
  );
}

/* ── Diario di commessa ───────────────────────────────────────────────── */

const TIPI: Record<string, { etichetta: string; icona: Icona; colore: string }> = {
  nota: { etichetta: "Nota", icona: NotebookPen, colore: "#8a5a2b" },
  telefonata: { etichetta: "Telefonata", icona: Phone, colore: "#3f5a6b" },
  riunione: { etichetta: "Riunione", icona: Users, colore: "#5c7a4c" },
  sopralluogo: { etichetta: "Sopralluogo", icona: Footprints, colore: "#7a5530" },
  email: { etichetta: "Email / PEC", icona: Mail, colore: "#45535f" },
  decisione: { etichetta: "Decisione", icona: Gavel, colore: "#9a3d2b" },
};

const dataOra = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

export function DiarioCommessa({
  commessaId,
  diario,
  modificabile = true,
  eliminabile = true,
}: {
  commessaId: string;
  diario: Nota[];
  /** Permesso "Diario" modificabile: registra nuove voci */
  modificabile?: boolean;
  /** Può eliminare le voci ("Completo" sulle commesse) */
  eliminabile?: boolean;
}) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  // null = consultazione; un tipo = modulo di registrazione aperto per quel tipo
  const [tipo, setTipo] = useState<string | null>(null);
  const [testo, setTesto] = useState("");
  const [giorno, setGiorno] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [daEliminare, setDaEliminare] = useState<string | null>(null);

  function chiudi() {
    setTipo(null);
    setTesto("");
    setGiorno("");
    setErrore(null);
  }

  function salva() {
    if (!tipo) return;
    setErrore(null);
    avvia(async () => {
      const esito = await aggiungiNota(commessaId, { tipo, testo, data: giorno });
      if (esito.ok) {
        chiudi();
        router.refresh();
      } else setErrore(esito.errore);
    });
  }

  function elimina(id: string) {
    setErrore(null);
    avvia(async () => {
      const esito = await eliminaNota(id);
      if (esito.ok) {
        setDaEliminare(null);
        router.refresh();
      } else setErrore(esito.errore);
    });
  }

  const scelto = tipo ? TIPI[tipo] : null;

  return (
    <div>
      {/* Registra: solo le icone; il modulo si apre scegliendone una */}
      {modificabile ? (
      <div className="flex flex-wrap items-center gap-2.5 border-b border-linea px-5 py-3.5 md:px-6">
        <span className="mr-1 text-sm text-tenue">Registra</span>
        {Object.entries(TIPI).map(([k, t]) => {
          const I = t.icona;
          const attivo = tipo === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => (attivo ? chiudi() : (setTipo(k), setErrore(null)))}
              aria-label={`Registra: ${t.etichetta}`}
              aria-pressed={attivo}
              data-suggerimento={t.etichetta}
              className={cn(
                "pallino grid size-10 place-items-center rounded-full text-white transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5",
                tipo && !attivo && "opacity-45",
                attivo && "ring-2 ring-offset-2 ring-offset-superficie",
              )}
              style={{
                background: `linear-gradient(145deg, color-mix(in srgb, ${t.colore} 72%, #ffffff) 0%, ${t.colore} 100%)`,
                ["--ombra" as string]: "43,42,40",
                ["--tw-ring-color" as string]: t.colore,
              }}
            >
              <I className="size-[17px]" strokeWidth={1.9} />
            </button>
          );
        })}
      </div>
      ) : null}

      {scelto ? (
        <form
          className="grid gap-3 border-b border-linea bg-superficie-2/60 px-5 py-4 md:px-6"
          onSubmit={(e) => {
            e.preventDefault();
            salva();
          }}
        >
          <AreaTesto
            etichetta={`Nuova voce · ${scelto.etichetta}`}
            id={`diario-${commessaId}`}
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Cosa è successo?"
            className="min-h-20"
            autoFocus
          />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-44">
              <Campo etichetta="Data" id={`diario-data-${commessaId}`} type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)} aiuto="Vuota = oggi" />
            </div>
            <div className="flex gap-2">
              <Pulsante type="button" variante="discreto" onClick={chiudi} disabled={inCorso}>
                Annulla
              </Pulsante>
              <Pulsante type="submit" disabled={inCorso || !testo.trim()}>
                {inCorso ? <Loader2 className="size-4 animate-spin" /> : <CalendarCheck2 className="size-4" strokeWidth={1.8} />}
                Registra
              </Pulsante>
            </div>
          </div>
        </form>
      ) : null}
      {errore ? (
        <div className="px-5 pt-4 md:px-6">
          <Messaggio tipo="errore">{errore}</Messaggio>
        </div>
      ) : null}

      {/* Linea del tempo */}
      {diario.length === 0 ? (
        <p className="px-5 py-6 text-[0.9375rem] text-tenue md:px-6">Ancora nessuna voce nel diario.</p>
      ) : (
        <ol className="relative px-5 py-4 md:px-6">
          <span aria-hidden className="absolute bottom-6 left-[2.35rem] top-6 w-px bg-linea md:left-[2.85rem]" />
          {diario.map((n) => {
            const t = TIPI[n.tipo] ?? TIPI.nota;
            const I = t.icona;
            return (
              <li key={n.id} className="group relative flex gap-4 py-3">
                <span
                  className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full text-white"
                  style={{ background: t.colore, boxShadow: `0 6px 14px -8px ${t.colore}` }}
                >
                  <I className="size-4" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-tenue">
                    <span className="font-medium text-inchiostro-2">{t.etichetta}</span>
                    {" · "}
                    {dataOra.format(new Date(n.data_evento))}
                    {n.autore ? ` · ${n.autore.nome} ${n.autore.cognome}` : null}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[0.9375rem]">{n.testo}</p>
                  {daEliminare === n.id ? (
                    <p className="mt-2 flex items-center gap-2 text-sm">
                      Eliminare questa voce?
                      <Pulsante type="button" variante="secondario" className="h-8 px-3 text-[color:var(--stato-sospesa)]" disabled={inCorso} onClick={() => elimina(n.id)}>
                        Elimina
                      </Pulsante>
                      <Pulsante type="button" variante="discreto" className="h-8 px-3" onClick={() => setDaEliminare(null)}>
                        No
                      </Pulsante>
                    </p>
                  ) : null}
                </div>
                {eliminabile ? (
                <button
                  type="button"
                  onClick={() => setDaEliminare(n.id)}
                  aria-label="Elimina la voce"
                  data-suggerimento="Elimina"
                  className="grid size-8 shrink-0 place-items-center rounded-full text-tenue opacity-0 transition hover:bg-superficie-2 hover:text-inchiostro focus:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-60"
                >
                  <Trash2 className="size-4" strokeWidth={1.8} />
                </button>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
