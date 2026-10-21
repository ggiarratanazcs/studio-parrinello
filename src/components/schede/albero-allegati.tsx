"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, FileImage, FileText, Folder, FolderOpen } from "lucide-react";
import { Messaggio } from "@/components/campo";
import type { Commessa } from "@/lib/dati";
import { cn, formattaData } from "@/lib/utils";
import { CATEGORIE_DOCUMENTO, apriDocumento, dimensione } from "./allegati-fase";

type Fase = NonNullable<Commessa["fasi"]>[number];
type Documento = NonNullable<Commessa["documenti"]>[number];

/** Cartella dell'albero: riga con freccia e icona, contenuto rientrato con la linea guida. */
function Cartella({
  id,
  nome,
  conteggio,
  aperte,
  onAlterna,
  livello,
  children,
}: {
  id: string;
  nome: string;
  conteggio: number;
  aperte: Set<string>;
  onAlterna: (id: string) => void;
  livello: number;
  children?: ReactNode;
}) {
  const aperta = aperte.has(id);
  const vuota = conteggio === 0;
  const Icona = aperta && !vuota ? FolderOpen : Folder;
  return (
    <li>
      <button
        type="button"
        onClick={() => !vuota && onAlterna(id)}
        aria-expanded={vuota ? undefined : aperta}
        className={cn(
          "flex w-full items-center gap-2 rounded-piccolo py-1.5 pr-2 text-left text-[0.9375rem] transition-colors",
          vuota ? "cursor-default text-tenue" : "hover:bg-superficie-2",
        )}
        style={{ paddingLeft: `${livello * 1.25 + 0.25}rem` }}
      >
        <ChevronRight
          className={cn("size-3.5 shrink-0 text-tenue transition-transform", aperta && "rotate-90", vuota && "invisible")}
          strokeWidth={2}
        />
        <Icona className={cn("size-[18px] shrink-0", vuota ? "text-tenue/60" : "text-accento")} strokeWidth={1.6} fill={vuota ? "none" : "currentColor"} fillOpacity={0.14} />
        <span className="min-w-0 flex-1 truncate">{nome}</span>
        <span className="numeri text-xs text-tenue">{vuota ? "vuota" : conteggio}</span>
      </button>
      {aperta && !vuota ? (
        <ul className="relative">
          <span aria-hidden className="absolute bottom-1 top-0 w-px bg-linea" style={{ left: `${livello * 1.25 + 0.7}rem` }} />
          {children}
        </ul>
      ) : null}
    </li>
  );
}

function File({ d, livello, onApri }: { d: Documento; livello: number; onApri: (d: Documento) => void }) {
  const Icona = d.mime_type?.startsWith("image/") ? FileImage : FileText;
  return (
    <li>
      <button
        type="button"
        onClick={() => onApri(d)}
        className="flex w-full items-center gap-2 rounded-piccolo py-1.5 pr-2 text-left transition-colors hover:bg-superficie-2"
        style={{ paddingLeft: `${livello * 1.25 + 1.15}rem` }}
        data-suggerimento="Apri il file"
      >
        <Icona className="size-4 shrink-0 text-tenue" strokeWidth={1.6} />
        <span className="min-w-0 flex-1 truncate text-[0.9375rem] hover:text-accento">{d.nome_file}</span>
        <span className="hidden whitespace-nowrap text-xs text-tenue sm:inline">
          {[dimensione(d.dimensione_byte), formattaData(d.created_at)].filter(Boolean).join(" · ")}
        </span>
      </button>
    </li>
  );
}

/**
 * Tutti gli allegati della commessa come albero di cartelle:
 * Commessa › Fase › Categoria › file. I file senza fase stanno in "Documenti generali".
 */
export function AlberoAllegati({ codice, fasi, documenti }: { codice: string; fasi: Fase[]; documenti: Documento[] }) {
  const radice = "radice";
  const [aperte, setAperte] = useState<Set<string>>(() => new Set([radice]));
  const [errore, setErrore] = useState<string | null>(null);

  const cartelleFase = [
    ...fasi.map((f) => ({ id: f.id, nome: [f.codice, f.nome].filter(Boolean).join(" · "), docs: documenti.filter((d) => d.fase_id === f.id) })),
    { id: "senza-fase", nome: "Documenti generali", docs: documenti.filter((d) => !d.fase_id || !fasi.some((f) => f.id === d.fase_id)) },
  ].filter((c) => c.id !== "senza-fase" || c.docs.length > 0);

  function alterna(id: string) {
    setAperte((a) => {
      const n = new Set(a);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function tutte(apri: boolean) {
    if (!apri) return setAperte(new Set([radice]));
    const ids = [radice];
    for (const c of cartelleFase) {
      ids.push(c.id);
      for (const cat of new Set(c.docs.map((d) => d.categoria))) ids.push(`${c.id}/${cat}`);
    }
    setAperte(new Set(ids));
  }

  const apri = (d: Documento) => {
    setErrore(null);
    apriDocumento(d.storage_path, () => setErrore("Non è stato possibile aprire il file."));
  };

  return (
    <div className="px-3 py-3 md:px-4">
      <div className="mb-2 flex justify-end gap-3 px-2 text-sm">
        <button type="button" onClick={() => tutte(true)} className="text-tenue hover:text-inchiostro">
          Espandi tutto
        </button>
        <button type="button" onClick={() => tutte(false)} className="text-tenue hover:text-inchiostro">
          Chiudi tutto
        </button>
      </div>
      <ul>
        <Cartella id={radice} nome={`Commessa ${codice}`} conteggio={documenti.length || cartelleFase.length} aperte={aperte} onAlterna={alterna} livello={0}>
          {cartelleFase.map((c) => {
            const categorie = Object.keys(CATEGORIE_DOCUMENTO).filter((k) => c.docs.some((d) => d.categoria === k));
            return (
              <Cartella key={c.id} id={c.id} nome={c.nome} conteggio={c.docs.length} aperte={aperte} onAlterna={alterna} livello={1}>
                {categorie.map((cat) => {
                  const docs = c.docs.filter((d) => d.categoria === cat);
                  return (
                    <Cartella
                      key={cat}
                      id={`${c.id}/${cat}`}
                      nome={CATEGORIE_DOCUMENTO[cat]}
                      conteggio={docs.length}
                      aperte={aperte}
                      onAlterna={alterna}
                      livello={2}
                    >
                      {docs.map((d) => (
                        <File key={d.id} d={d} livello={3} onApri={apri} />
                      ))}
                    </Cartella>
                  );
                })}
              </Cartella>
            );
          })}
        </Cartella>
      </ul>
      {documenti.length === 0 ? (
        <p className="px-2 pt-2 text-sm text-tenue">Nessun allegato. Caricali qui sopra oppure con il + nella tabella delle fasi.</p>
      ) : null}
      {errore ? (
        <div className="px-2 pt-2">
          <Messaggio tipo="errore">{errore}</Messaggio>
        </div>
      ) : null}
    </div>
  );
}
