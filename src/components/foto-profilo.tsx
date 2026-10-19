"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Messaggio } from "@/components/campo";
import { createClient } from "@/lib/supabase/client";

/** Riduce l'immagine a un quadrato di 320 px (ritaglio centrale) in JPEG: foto leggera e uniforme. */
async function quadrato(file: File, lato = 320): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const minimo = Math.min(bitmap.width, bitmap.height);
  const tela = document.createElement("canvas");
  tela.width = lato;
  tela.height = lato;
  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, (bitmap.width - minimo) / 2, (bitmap.height - minimo) / 2, minimo, minimo, 0, 0, lato, lato);
  return new Promise((ok, ko) => tela.toBlob((b) => (b ? ok(b) : ko(new Error("blob"))), "image/jpeg", 0.88));
}

/** Foto del profilo: anteprima nel pallino, carica (anche dalla fotocamera del telefono) o togli. */
export function FotoProfilo({ id, iniziali, foto }: { id: string; iniziali: string; foto: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function carica(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErrore("Scegli un'immagine (JPG, PNG, HEIC…).");
    setErrore(null);
    setInCorso(true);
    try {
      const supabase = createClient();
      const blob = await quadrato(file);
      const percorso = `profili/${id}/foto-${Date.now()}.jpg`;
      const su = await supabase.storage.from("documenti").upload(percorso, blob, { contentType: "image/jpeg" });
      if (su.error) throw su.error;
      const { data: vecchio } = await supabase.from("profili").select("foto_path").eq("id", id).single();
      const { error } = await supabase.from("profili").update({ foto_path: percorso }).eq("id", id);
      if (error) throw error;
      if (vecchio?.foto_path) await supabase.storage.from("documenti").remove([vecchio.foto_path]);
      router.refresh();
    } catch {
      setErrore("Non è stato possibile caricare la foto. Riprova con un'altra immagine.");
    } finally {
      setInCorso(false);
      if (input.current) input.current.value = "";
    }
  }

  async function togli() {
    setErrore(null);
    setInCorso(true);
    const supabase = createClient();
    const { data: vecchio } = await supabase.from("profili").select("foto_path").eq("id", id).single();
    const { error } = await supabase.from("profili").update({ foto_path: null }).eq("id", id);
    if (!error && vecchio?.foto_path) await supabase.storage.from("documenti").remove([vecchio.foto_path]);
    setInCorso(false);
    if (error) setErrore("Non è stato possibile togliere la foto.");
    else router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-inchiostro text-xl font-medium text-superficie shadow-[0_12px_24px_-12px_rgba(43,42,40,0.7)]">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="La tua foto" className="absolute inset-0 size-full object-cover" />
        ) : (
          iniziali
        )}
        {inCorso ? (
          <span className="absolute inset-0 grid place-items-center bg-inchiostro/50">
            <Loader2 className="size-6 animate-spin text-white" />
          </span>
        ) : null}
      </span>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input ref={input} id="foto-profilo" type="file" accept="image/*" className="sr-only" onChange={(e) => carica(e.target.files?.[0])} />
          <label
            htmlFor="foto-profilo"
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-linea-forte bg-superficie px-4 text-[0.9375rem] font-medium hover:bg-superficie-2"
          >
            <Camera className="size-4" strokeWidth={1.8} />
            {foto ? "Cambia foto" : "Carica una foto"}
          </label>
          {foto ? (
            <button
              type="button"
              onClick={togli}
              disabled={inCorso}
              className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.9375rem] text-tenue hover:bg-superficie-2 hover:text-inchiostro"
            >
              <Trash2 className="size-4" strokeWidth={1.8} />
              Togli
            </button>
          ) : null}
        </div>
        <p className="text-sm text-tenue">Senza foto compare il pallino con le tue iniziali.</p>
      </div>
      {errore ? (
        <div className="w-full">
          <Messaggio tipo="errore">{errore}</Messaggio>
        </div>
      ) : null}
    </div>
  );
}
