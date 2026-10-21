"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileImage, FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { Messaggio } from "@/components/campo";
import { Pulsante } from "@/components/ui";
import type { Commessa } from "@/lib/dati";
import { createClient } from "@/lib/supabase/client";
import { Compasso } from "@/components/compasso";
import { cn, formattaData } from "@/lib/utils";

type Documento = NonNullable<Commessa["documenti"]>[number];

export const CATEGORIE_DOCUMENTO: Record<string, string> = {
  elaborato_grafico: "Elaborato grafico",
  relazione: "Relazione",
  foto_sopralluogo: "Foto sopralluogo",
  rilievo: "Rilievo",
  pratica_edilizia: "Pratica edilizia",
  catastale: "Catastale",
  computo: "Computo",
  render: "Render",
  corrispondenza: "Corrispondenza / PEC",
  contratto_incarico: "Contratto / incarico",
  preventivo: "Preventivo",
  altro: "Altro",
};

const MAX_BYTE = 100 * 1024 * 1024;

/** Apre un file del bucket privato con un collegamento temporaneo (10 minuti) in una nuova scheda. */
export function apriDocumento(percorso: string, onErrore: () => void) {
  // Finestra aperta subito (dentro il clic) per non essere bloccata dal browser
  const finestra = window.open("", "_blank");
  createClient()
    .storage.from("documenti")
    .createSignedUrl(percorso, 60 * 10)
    .then(({ data, error }) => {
      if (error || !data) {
        finestra?.close();
        onErrore();
      } else if (finestra) finestra.location.href = data.signedUrl;
      else window.location.href = data.signedUrl;
    });
}

export function dimensione(b: number | null) {
  if (!b) return "";
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  return `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** Nome file sicuro per il percorso nello storage (senza accenti, spazi o simboli). */
function nomeSicuro(nome: string) {
  const punto = nome.lastIndexOf(".");
  const base = (punto > 0 ? nome.slice(0, punto) : nome)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const est = punto > 0 ? nome.slice(punto + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return `${base || "file"}${est ? `.${est}` : ""}`;
}


/**
 * Carica i file nello spazio "documenti" sotto {commessa}/{fase o "generali"}/ e li registra.
 * Le immagini caricate come elaborato grafico diventano foto. Restituisce un messaggio d'errore o null.
 */
export async function caricaAllegati(
  commessaId: string | null,
  faseId: string | null,
  elenco: File[],
  categoria = "elaborato_grafico",
  progresso?: (fatti: number, totali: number) => void,
  /** Documento dell'immobile, senza commessa */
  immobileId?: string,
): Promise<string | null> {
  const troppoGrandi = elenco.filter((f) => f.size > MAX_BYTE);
  if (troppoGrandi.length) return `Supera i 100 MB: ${troppoGrandi.map((f) => f.name).join(", ")}`;
  const supabase = createClient();
  progresso?.(0, elenco.length);
  const falliti: string[] = [];
  for (const [i, file] of elenco.entries()) {
    const cartella = immobileId && !commessaId ? `immobili/${immobileId}` : `${commessaId}/${faseId ?? "generali"}`;
    const percorso = `${cartella}/${Date.now()}-${i}-${nomeSicuro(file.name)}`;
    const su = await supabase.storage.from("documenti").upload(percorso, file, { contentType: file.type || undefined });
    if (su.error) {
      falliti.push(file.name);
    } else {
      const immagine = file.type.startsWith("image/");
      const { error } = await supabase.from("documenti").insert({
        commessa_id: commessaId,
        fase_id: faseId,
        ...(immobileId ? { immobile_id: immobileId } : {}),
        categoria: immagine && categoria === "elaborato_grafico" ? "foto_sopralluogo" : categoria,
        titolo: file.name.replace(/\.[^.]+$/, ""),
        nome_file: file.name,
        storage_path: percorso,
        mime_type: file.type || null,
        dimensione_byte: file.size,
        scattata_il: immagine && file.lastModified ? new Date(file.lastModified).toISOString() : null,
      });
      if (error) {
        falliti.push(file.name);
        await supabase.storage.from("documenti").remove([percorso]);
      }
    }
    progresso?.(i + 1, elenco.length);
  }
  return falliti.length ? `Non caricati: ${falliti.join(", ")}. Riprova.` : null;
}

/** Elimina un allegato (riga e file); false se il profilo non può. */
export async function eliminaAllegato(d: { id: string; storage_path: string }) {
  const supabase = createClient();
  const { data, error } = await supabase.from("documenti").delete().eq("id", d.id).select("id");
  if (error || !data?.length) return false;
  await supabase.storage.from("documenti").remove([d.storage_path]);
  return true;
}

/**
 * Allegati di una fase: caricamento di più file (anche foto dal telefono), elenco,
 * apertura con collegamento temporaneo ed eliminazione. I file vanno nel bucket privato
 * "documenti" sotto {commessa}/{fase}/.
 */
export function AllegatiFase({
  commessaId,
  faseId,
  documenti,
  modificabile = true,
  eliminabile = true,
  soloCaricamento = false,
}: {
  commessaId: string;
  /** null = documenti generali della commessa, senza fase */
  faseId: string | null;
  documenti: Documento[];
  /** Può caricare file (permesso "Allegati" modificabile) */
  modificabile?: boolean;
  /** Può eliminarli (anche "Completo" sulle commesse) */
  eliminabile?: boolean;
  /** Solo la zona di caricamento, senza titolo né elenco (l'elenco è altrove) */
  soloCaricamento?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState("elaborato_grafico");
  const [caricamento, setCaricamento] = useState<{ fatti: number; totali: number } | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();
  const [daEliminare, setDaEliminare] = useState<string | null>(null);
  const [sopra, setSopra] = useState(false);
  const idFile = `file-${faseId ?? `generali-${commessaId}`}`;

  async function carica(files: FileList | null) {
    if (!files?.length) return;
    setErrore(null);
    const esito = await caricaAllegati(commessaId, faseId, Array.from(files), categoria, (fatti, totali) => setCaricamento({ fatti, totali }));
    setCaricamento(null);
    if (input.current) input.current.value = "";
    if (esito) setErrore(esito);
    router.refresh();
  }

  function apri(d: Documento) {
    setErrore(null);
    apriDocumento(d.storage_path, () => setErrore("Non è stato possibile aprire il file."));
  }

  function elimina(d: Documento) {
    setErrore(null);
    avvia(async () => {
      if (!(await eliminaAllegato(d))) {
        setErrore("Il tuo profilo non può eliminare questo allegato.");
        return;
      }
      setDaEliminare(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {soloCaricamento ? null : (
      <>
      <div className="flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-medium text-inchiostro-2">
          <Paperclip className="size-4" strokeWidth={1.8} />
          {faseId ? "Allegati della fase" : "Documenti generali della commessa"}
          {documenti.length ? <span className="numeri text-tenue">({documenti.length})</span> : null}
        </h4>
      </div>

      {documenti.length ? (
        <ul className="divide-y divide-linea rounded-medio border border-linea bg-superficie">
          {documenti.map((d) => {
            const Icona = d.mime_type?.startsWith("image/") ? FileImage : FileText;
            return (
              <li key={d.id} className="group flex items-center gap-3 px-3 py-2.5">
                <Icona className="size-5 shrink-0 text-tenue" strokeWidth={1.6} />
                <button type="button" onClick={() => apri(d)} className="min-w-0 flex-1 text-left" data-suggerimento="Apri il file">
                  <span className="block truncate text-[0.9375rem] hover:text-accento">{d.nome_file}</span>
                  <span className="block truncate text-xs text-tenue">
                    {[CATEGORIE_DOCUMENTO[d.categoria] ?? d.categoria, dimensione(d.dimensione_byte), formattaData(d.created_at)].filter(Boolean).join(" · ")}
                  </span>
                </button>
                {!eliminabile ? null : daEliminare === d.id ? (
                  <span className="flex items-center gap-1.5 text-sm">
                    <Pulsante type="button" variante="secondario" className="h-8 px-3 text-[color:var(--stato-sospesa)]" disabled={inCorso} onClick={() => elimina(d)}>
                      Elimina
                    </Pulsante>
                    <Pulsante type="button" variante="discreto" className="h-8 px-3" onClick={() => setDaEliminare(null)}>
                      No
                    </Pulsante>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDaEliminare(d.id)}
                    aria-label={`Elimina ${d.nome_file}`}
                    data-suggerimento="Elimina"
                    className="grid size-8 shrink-0 place-items-center rounded-full text-tenue opacity-60 transition hover:bg-superficie-2 hover:text-inchiostro group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" strokeWidth={1.8} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-tenue">{modificabile ? "Nessun allegato. Carica tavole, relazioni, pratiche o foto dal cantiere." : "Nessun allegato."}</p>
      )}
      </>
      )}

      {modificabile ? (
        <div
          className={cn("flex flex-wrap items-center gap-2 rounded-medio border border-dashed p-2 transition-colors", sopra ? "border-accento bg-accento/5" : "border-linea")}
          onDragOver={(e) => {
            e.preventDefault();
            setSopra(true);
          }}
          onDragLeave={() => setSopra(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSopra(false);
            carica(e.dataTransfer.files);
          }}
        >
        <select
          aria-label="Categoria dei file"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="h-10 rounded-medio border border-linea-forte bg-superficie px-3 text-sm"
        >
          {Object.entries(CATEGORIE_DOCUMENTO).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input ref={input} type="file" multiple className="sr-only" id={idFile} onChange={(e) => carica(e.target.files)} />
        <label
          htmlFor={idFile}
          className={cn(
            "inline-flex h-10 cursor-pointer items-center gap-2 rounded-medio border border-linea-forte bg-superficie px-4 text-[0.9375rem] font-medium transition-colors hover:bg-superficie-2",
            caricamento && "pointer-events-none opacity-60",
          )}
        >
          {caricamento ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" strokeWidth={1.8} />}
          {caricamento ? `Caricamento ${caricamento.fatti}/${caricamento.totali}…` : "Carica file"}
        </label>
        <span className="text-sm text-tenue">o trascinali qui</span>
        </div>
      ) : null}
      {caricamento ? (
        <div className="flex items-center gap-4 rounded-medio bg-superficie-2/60 px-4 py-2">
          <Compasso className="w-16 shrink-0" didascalia={null} />
          <span className="text-[0.9375rem] text-inchiostro-2">
            Carico {caricamento.totali === 1 ? "il file" : `${Math.min(caricamento.fatti + 1, caricamento.totali)} di ${caricamento.totali} file`}…
          </span>
        </div>
      ) : null}
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
    </div>
  );
}
