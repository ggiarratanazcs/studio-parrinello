"use server";

import { getProfilo } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { leggiStudio } from "@/lib/studio";
import { normalizza, punteggio, CATEGORIE_DA_PAROLA } from "@/lib/assistente/testo";
import type { DocumentoTrovato, IndiceAssistente } from "@/lib/assistente/tipi";

/** L'assistente è riservato a titolare e architetti. */
export async function puoUsareAssistente() {
  const profilo = await getProfilo();
  return profilo.ruolo === "titolare" || profilo.ruolo === "architetto";
}

/**
 * Dati su cui l'assistente lavora: clienti con referenti, commesse, immobili e fasi aperte.
 * Letti con l'utente collegato, quindi valgono le stesse regole di accesso del resto dell'app.
 */
export async function indiceAssistente(): Promise<IndiceAssistente | null> {
  if (!(await puoUsareAssistente())) return null;
  const supabase = await createClient();
  const [profilo, studio, clienti, referenti, commesse, immobili, fasi] = await Promise.all([
    getProfilo(),
    leggiStudio(),
    supabase.from("clienti").select("id, tipo, denominazione, nome, cognome, ragione_sociale, telefono, email, pec, comune").limit(5000),
    supabase.from("clienti_referenti").select("cliente_id, nome, ruolo, telefono, email").limit(10000),
    supabase.from("commesse").select("id, codice, titolo, stato, cliente_id, immobile_id").order("data_apertura", { ascending: false }).limit(5000),
    supabase.from("immobili").select("id, denominazione, indirizzo, comune").limit(5000),
    supabase
      .from("commesse_fasi")
      .select("id, codice, nome, stato, data_fine_prev, avanzamento_pct, commessa_id")
      .not("stato", "in", "(completata,annullata)")
      .not("data_fine_prev", "is", null)
      .limit(5000),
  ]);

  const nomeCliente = (c: { denominazione: string | null; nome: string | null; cognome: string | null; ragione_sociale: string | null }) =>
    c.denominazione || c.ragione_sociale || [c.nome, c.cognome].filter(Boolean).join(" ") || "Senza nome";
  const perCliente = new Map<string, IndiceAssistente["clienti"][number]["referenti"]>();
  for (const r of referenti.data ?? []) {
    const elenco = perCliente.get(r.cliente_id) ?? [];
    elenco.push({ nome: r.nome, ruolo: r.ruolo, telefono: r.telefono, email: r.email });
    perCliente.set(r.cliente_id, elenco);
  }
  const elencoClienti = (clienti.data ?? []).map((c) => ({
    id: c.id,
    nome: nomeCliente(c),
    persona: c.tipo === "persona_fisica",
    telefono: c.telefono,
    email: c.email || c.pec,
    comune: c.comune,
    referenti: perCliente.get(c.id) ?? [],
  }));
  const nomeDi = new Map(elencoClienti.map((c) => [c.id, c.nome]));
  const elencoImmobili = (immobili.data ?? []).map((i) => ({
    id: i.id,
    nome: i.denominazione || i.indirizzo,
    indirizzo: [i.indirizzo, i.comune].filter(Boolean).join(", "),
  }));
  const immobileDi = new Map(elencoImmobili.map((i) => [i.id, i.nome]));
  const elencoCommesse = (commesse.data ?? []).map((c) => ({
    id: c.id,
    codice: c.codice,
    titolo: c.titolo,
    stato: c.stato,
    clienteId: c.cliente_id,
    cliente: nomeDi.get(c.cliente_id) ?? null,
    immobile: c.immobile_id ? (immobileDi.get(c.immobile_id) ?? null) : null,
  }));
  const commessaDi = new Map(elencoCommesse.map((c) => [c.id, c]));

  return {
    utente: [profilo.nome, profilo.cognome].filter(Boolean).join(" "),
    studio: studio.nome,
    clienti: elencoClienti,
    commesse: elencoCommesse,
    immobili: elencoImmobili,
    fasi: (fasi.data ?? [])
      .filter((f) => commessaDi.has(f.commessa_id))
      .map((f) => ({
        id: f.id,
        nome: [f.codice, f.nome].filter(Boolean).join(" · "),
        stato: f.stato,
        fine: f.data_fine_prev!,
        avanzamento: f.avanzamento_pct,
        commessaId: f.commessa_id,
        commessa: commessaDi.get(f.commessa_id)!.codice ?? commessaDi.get(f.commessa_id)!.titolo,
      })),
  };
}

/** Cerca file nell'archivio: parole nel nome, nella commessa o nell'immobile; "visura", "foto", "pianta"… filtrano la categoria. */
export async function cercaDocumentiAssistente(testo: string): Promise<DocumentoTrovato[]> {
  if (!(await puoUsareAssistente())) return [];
  const parole = normalizza(testo).split(" ").filter(Boolean);
  const categorie = new Set<string>();
  const resto: string[] = [];
  for (const p of parole) {
    const c = CATEGORIE_DA_PAROLA[p];
    if (c) c.forEach((x) => categorie.add(x));
    else resto.push(p);
  }
  const supabase = await createClient();
  let query = supabase
    .from("documenti")
    .select("id, nome_file, titolo, categoria, created_at, storage_path, mime_type, immobile_id, commessa:commesse(id, codice, titolo), fase:commesse_fasi(codice, nome)")
    .order("created_at", { ascending: false })
    .limit(4000);
  if (categorie.size) query = query.in("categoria", [...categorie]);
  const { data } = await query;
  const righe = data ?? [];

  const idImmobili = [...new Set(righe.map((r) => r.immobile_id).filter((x): x is string => !!x))];
  const { data: immobili } = idImmobili.length
    ? await supabase.from("immobili").select("id, denominazione, indirizzo").in("id", idImmobili)
    : { data: [] as { id: string; denominazione: string | null; indirizzo: string }[] };
  const nomeImmobile = new Map((immobili ?? []).map((i) => [i.id, i.denominazione || i.indirizzo]));

  return righe
    .map((r) => {
      const immobile = !r.commessa && r.immobile_id ? (nomeImmobile.get(r.immobile_id) ?? null) : null;
      const provenienza = r.commessa
        ? `${r.commessa.codice ?? "Commessa"} › ${r.fase ? r.fase.codice || r.fase.nome : "Generali"}`
        : (immobile ?? "Studio");
      const testoRiga = [r.nome_file, r.titolo, r.commessa?.codice, r.commessa?.titolo, r.fase?.nome, immobile].filter(Boolean).join(" ");
      return {
        punti: resto.length ? punteggio(resto, testoRiga) : 1,
        doc: { id: r.id, nome: r.nome_file, provenienza, data: r.created_at, storagePath: r.storage_path, foto: !!r.mime_type?.startsWith("image/") },
      };
    })
    .filter((x) => x.punti > 0)
    .sort((a, b) => b.punti - a.punti)
    .slice(0, 8)
    .map((x) => x.doc);
}
