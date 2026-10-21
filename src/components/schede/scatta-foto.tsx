"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, ImagePlus, X } from "lucide-react";
import { caricaAllegati } from "./allegati-fase";
import { cn } from "@/lib/utils";

export type FaseFoto = { id: string; nome: string; propria: boolean; inCorso: boolean };

/**
 * Su telefono, in basso nella commessa: "Scatta foto" apre la fotocamera; dopo lo scatto
 * si sceglie dove salvarla (la propria fase in corso è già proposta) e si può scattarne subito un'altra.
 * Il pulsante piccolo accanto sceglie foto dalla galleria.
 */
export function ScattaFoto({ commessaId, fasi }: { commessaId: string; fasi: FaseFoto[] }) {
  const router = useRouter();
  const fotocamera = useRef<HTMLInputElement>(null);
  const galleria = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File[]>([]);
  const [anteprima, setAnteprima] = useState<string | null>(null);
  const [dove, setDove] = useState<string>("");
  const [invio, setInvio] = useState(0);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatte, setFatte] = useState(0);

  // Ordine: prima le proprie fasi (quelle in corso in testa), poi le altre, infine i documenti generali
  const ordinate = [...fasi].sort((a, b) => Number(b.propria) - Number(a.propria) || Number(b.inCorso) - Number(a.inCorso));
  const proposta = ordinate.find((f) => f.propria && f.inCorso) ?? ordinate.find((f) => f.propria) ?? ordinate.find((f) => f.inCorso) ?? ordinate[0];

  // Anteprima: indirizzo locale della foto, liberato quando non serve più
  function cambiaAnteprima(nuova: File | null) {
    setAnteprima((vecchia) => {
      if (vecchia) URL.revokeObjectURL(vecchia);
      return nuova ? URL.createObjectURL(nuova) : null;
    });
  }

  function scelti(lista: FileList | null) {
    if (!lista?.length) return;
    setErrore(null);
    setFile(Array.from(lista));
    cambiaAnteprima(lista[0]);
    setDove((d) => d || proposta?.id || "generali");
  }

  function chiudi() {
    setFile([]);
    cambiaAnteprima(null);
  }

  // Il salvataggio prosegue in sottofondo: così "scatta un'altra" apre subito la fotocamera
  // (i telefoni la aprono solo se il comando arriva direttamente dal tocco)
  function salva(altra: boolean) {
    const daSalvare = file;
    const destinazione = dove === "generali" ? null : dove;
    if (galleria.current) galleria.current.value = "";
    if (fotocamera.current) fotocamera.current.value = "";
    if (altra) fotocamera.current?.click();
    setFile([]);
    cambiaAnteprima(null);
    setErrore(null);
    setInvio((n) => n + 1);
    caricaAllegati(commessaId, destinazione, daSalvare, "foto_sopralluogo").then((esito) => {
      setInvio((n) => n - 1);
      if (esito) setErrore(esito);
      else setFatte((n) => n + daSalvare.length);
      router.refresh();
    });
  }

  return (
    <div className="md:hidden">
      <input ref={fotocamera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => scelti(e.target.files)} />
      <input ref={galleria} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={(e) => scelti(e.target.files)} />

      {/* Pulsanti fissi sopra la barra di navigazione */}
      {!file.length ? (
        <div className="fixed inset-x-4 z-[60] flex flex-col gap-2" style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.25rem)" }}>
          {invio || errore || fatte ? (
            <p
              className={cn(
                "self-center rounded-full bg-superficie px-3.5 py-1.5 text-sm shadow-[0_10px_24px_-14px_rgba(43,42,40,0.5)]",
                errore ? "text-[color:var(--stato-sospesa)]" : "text-inchiostro-2",
              )}
              onClick={() => {
                setErrore(null);
                setFatte(0);
              }}
            >
              {invio ? "Salvataggio in corso…" : errore ? errore : `${fatte} ${fatte === 1 ? "foto salvata" : "foto salvate"}`}
            </p>
          ) : null}
          <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fotocamera.current?.click()}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-inchiostro text-[0.9375rem] font-medium text-superficie shadow-[0_14px_30px_-12px_rgba(43,42,40,0.6)] active:scale-[0.98]"
          >
            <Camera className="size-5" strokeWidth={1.8} />
            Scatta foto
          </button>
          <button
            type="button"
            onClick={() => galleria.current?.click()}
            aria-label="Scegli dalla galleria"
            className="grid size-12 place-items-center rounded-full border border-linea-forte bg-superficie text-inchiostro-2 shadow-[0_14px_30px_-14px_rgba(43,42,40,0.45)] active:scale-[0.98]"
          >
            <ImagePlus className="size-5" strokeWidth={1.7} />
          </button>
          </div>
        </div>
      ) : null}

      {/* Dopo lo scatto: dove salvarla */}
      {file.length ? (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/40" onClick={chiudi}>
          <div
            className="max-h-[90dvh] overflow-y-auto rounded-t-[22px] bg-superficie px-5 pt-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-linea-forte" />
            <div className="flex items-start gap-3">
              {anteprima ? (
                // Anteprima locale della foto appena scattata
                // eslint-disable-next-line @next/next/no-img-element
                <img src={anteprima} alt="" className="size-20 shrink-0 rounded-medio object-cover" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-[1.0625rem] font-medium">Dove la salvo?</p>
                <p className="text-sm text-tenue">
                  {file.length > 1 ? `${file.length} foto` : "1 foto"} · Foto sopralluogo

                </p>
              </div>
              <button type="button" onClick={chiudi} aria-label="Chiudi" className="grid size-9 place-items-center rounded-full text-tenue">
                <X className="size-5" strokeWidth={1.8} />
              </button>
            </div>

            <div role="radiogroup" aria-label="Dove salvare la foto" className="mt-4 flex flex-col gap-2">
              {[...ordinate.map((f) => ({ id: f.id, nome: f.nome, nota: f.propria ? "tua" : null })), { id: "generali", nome: "Documenti generali", nota: null }].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={dove === o.id}
                  onClick={() => setDove(o.id)}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-medio border px-3.5 text-left text-[0.9375rem]",
                    dove === o.id ? "border-inchiostro bg-superficie-2/60" : "border-linea",
                  )}
                >
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", dove === o.id ? "border-inchiostro bg-inchiostro text-superficie" : "border-linea-forte")}>
                    {dove === o.id ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{o.nome}</span>
                  {o.nota ? <span className="text-xs text-tenue">{o.nota}</span> : null}
                </button>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => salva(false)}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-linea-forte text-[0.9375rem] font-medium"
              >
                Salva
              </button>
              <button
                type="button"
                onClick={() => salva(true)}
                className="flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-full bg-inchiostro text-[0.9375rem] font-medium text-superficie disabled:opacity-60"
              >
                <Camera className="size-4" strokeWidth={1.8} />
                Salva e scatta un&apos;altra
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
