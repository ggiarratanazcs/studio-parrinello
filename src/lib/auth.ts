import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfiloCorrente = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: string;
  qualifica: string | null;
  iniziali: string;
  /** Collegamento temporaneo alla foto del profilo, se caricata */
  foto: string | null;
};

/**
 * Restituisce il profilo dell'utente collegato (una sola lettura per richiesta).
 * Legge i cookie: va chiamato dentro un <Suspense>.
 */
export const getProfilo = cache(async (): Promise<ProfiloCorrente> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/accesso");

  const { data: profilo } = await supabase
    .from("profili")
    .select("id, nome, cognome, email, ruolo, qualifica, iniziali, foto_path")
    .eq("id", userId)
    .single();

  if (!profilo) redirect("/accesso?errore=profilo");

  const iniziali =
    profilo.iniziali ||
    `${profilo.nome.charAt(0)}${profilo.cognome.charAt(0)}`.toUpperCase() ||
    profilo.email.charAt(0).toUpperCase();

  let foto: string | null = null;
  if (profilo.foto_path) {
    const { data } = await supabase.storage.from("documenti").createSignedUrl(profilo.foto_path, 60 * 60 * 24);
    foto = data?.signedUrl ?? null;
  }

  return {
    id: profilo.id,
    nome: profilo.nome,
    cognome: profilo.cognome,
    email: profilo.email,
    ruolo: profilo.ruolo,
    qualifica: profilo.qualifica,
    iniziali,
    foto,
  };
});
