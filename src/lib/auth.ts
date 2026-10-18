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
    .select("id, nome, cognome, email, ruolo, qualifica, iniziali")
    .eq("id", userId)
    .single();

  if (!profilo) redirect("/accesso?errore=profilo");

  const iniziali =
    profilo.iniziali ||
    `${profilo.nome.charAt(0)}${profilo.cognome.charAt(0)}`.toUpperCase() ||
    profilo.email.charAt(0).toUpperCase();

  return { ...profilo, iniziali };
});
