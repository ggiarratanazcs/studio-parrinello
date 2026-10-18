/**
 * Indirizzo e chiave pubblica del progetto Supabase "commesse".
 * Sono dati pubblici per definizione (finiscono comunque nel browser): la protezione
 * dei dati è garantita dalle policy RLS del database. Le variabili d'ambiente,
 * se presenti, hanno la precedenza.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wlvqivxdhnzqcvsucmre.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_egDPt2AwefoStbDYOh4dnA_dVOmbth9";
