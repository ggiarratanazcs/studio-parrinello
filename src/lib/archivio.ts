import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getPermessi } from "@/lib/permessi";

export type DocumentoArchivio = {
  id: string;
  titolo: string;
  nome_file: string;
  categoria: string;
  data: string;
  storage_path: string;
  mime_type: string | null;
  dimensione_byte: number | null;
  caricatoDa: string | null;
  commessa: { id: string; codice: string | null; titolo: string } | null;
  fase: { id: string; codice: string | null; nome: string; ordine: number } | null;
  /** Immobile su cui è stato caricato direttamente (documenti senza commessa) */
  immobile: { id: string; nome: string } | null;
  /** Collegamento temporaneo per l'anteprima delle foto */
  miniatura: string | null;
};

export type DatiArchivio = {
  documenti: DocumentoArchivio[];
  /** Può caricare documenti dello studio e degli immobili (Archivio ≥ Modifica) */
  caricabili: boolean;
  /** Può caricare allegati nelle commesse (Allegati modificabili) */
  caricabiliCommesse: boolean;
  /** Può eliminare (Archivio Completo) */
  eliminabili: boolean;
};

const MASSIMO_DOCUMENTI = 5000;
const MASSIMO_MINIATURE = 400;

/**
 * Tutti i documenti che l'utente può vedere (le regole del database filtrano già),
 * con commessa, fase, immobile e chi li ha caricati; per le foto più recenti un'anteprima.
 */
export async function leggiArchivio(): Promise<DatiArchivio> {
  const supabase = await createClient();
  const permessi = await getPermessi();
  const { data, error } = await supabase
    .from("documenti")
    .select(
      "id, titolo, nome_file, categoria, created_at, storage_path, mime_type, dimensione_byte, caricato_da, immobile_id, commessa:commesse(id, codice, titolo), fase:commesse_fasi(id, codice, nome, ordine)",
    )
    .order("created_at", { ascending: false })
    .limit(MASSIMO_DOCUMENTI);
  if (error) throw new Error(`Impossibile leggere l'archivio: ${error.message}`);
  const righe = data ?? [];

  const idImmobili = [...new Set(righe.map((r) => r.immobile_id).filter((x): x is string => !!x))];
  const idPersone = [...new Set(righe.map((r) => r.caricato_da).filter((x): x is string => !!x))];
  const foto = righe.filter((r) => r.mime_type?.startsWith("image/")).slice(0, MASSIMO_MINIATURE);

  const [immobili, persone, firmati] = await Promise.all([
    idImmobili.length
      ? supabase.from("immobili").select("id, denominazione, indirizzo, comune").in("id", idImmobili)
      : Promise.resolve({ data: [] as { id: string; denominazione: string | null; indirizzo: string | null; comune: string | null }[] }),
    idPersone.length ? supabase.from("profili").select("id, nome, cognome").in("id", idPersone) : Promise.resolve({ data: [] as { id: string; nome: string | null; cognome: string | null }[] }),
    foto.length ? supabase.storage.from("documenti").createSignedUrls(foto.map((f) => f.storage_path), 60 * 60) : Promise.resolve({ data: [] }),
  ]);

  const nomeImmobile = new Map(
    (immobili.data ?? []).map((i) => [i.id, i.denominazione || [i.indirizzo, i.comune].filter(Boolean).join(", ") || "Immobile"]),
  );
  const nomePersona = new Map((persone.data ?? []).map((p) => [p.id, [p.nome, p.cognome].filter(Boolean).join(" ")]));
  const miniature = new Map<string, string>();
  for (const s of firmati.data ?? []) if (s.path && s.signedUrl) miniature.set(s.path, s.signedUrl);

  const documenti: DocumentoArchivio[] = righe.map((r) => ({
    id: r.id,
    titolo: r.titolo,
    nome_file: r.nome_file,
    categoria: r.categoria,
    data: r.created_at,
    storage_path: r.storage_path,
    mime_type: r.mime_type,
    dimensione_byte: r.dimensione_byte,
    caricatoDa: r.caricato_da ? nomePersona.get(r.caricato_da) || null : null,
    commessa: r.commessa ? { id: r.commessa.id, codice: r.commessa.codice, titolo: r.commessa.titolo } : null,
    fase: r.fase ? { id: r.fase.id, codice: r.fase.codice, nome: r.fase.nome, ordine: r.fase.ordine } : null,
    immobile: !r.commessa && r.immobile_id ? { id: r.immobile_id, nome: nomeImmobile.get(r.immobile_id) ?? "Immobile" } : null,
    miniatura: miniature.get(r.storage_path) ?? null,
  }));

  return {
    documenti,
    caricabili: permessi.liv("documenti") >= 2,
    caricabiliCommesse: permessi.liv("c.allegati") >= 2,
    eliminabili: permessi.liv("documenti") >= 3,
  };
}
