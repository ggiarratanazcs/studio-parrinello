import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * "Da fare" della home: cosa richiede attenzione, calcolato dai dati esistenti.
 *  - In ritardo: fasi oltre la fine prevista; preventivi inviati con validità scaduta
 *  - Questa settimana e la prossima: fasi entro 14 giorni; preventivi senza risposta da 15+ giorni
 *  - Da far avanzare: pre-fattibilità consegnate senza preventivo; bozze di preventivo mai inviate
 */

/** Soglie (per ora fisse) */
export const GIORNI_FINESTRA_FASI = 14;
export const GIORNI_SOLLECITO = 15;

export type GruppoDaFare = "ritardo" | "presto" | "avanzare";
export type TipoDaFare = "fase" | "preventivo" | "bozza" | "prefattibilita";

export type VoceDaFare = {
  id: string;
  gruppo: GruppoDaFare;
  tipo: TipoDaFare;
  /** Per ordinare dentro il gruppo: più piccolo = più urgente */
  peso: number;
  titolo: string;
  contesto: string;
  quando: string;
  tono: "allarme" | "attenzione" | "neutro";
  scheda: string;
  azione: { etichetta: string; href: string };
  responsabileId: string | null;
};

export type AttivitaRecente = {
  id: string;
  tipo: string;
  testo: string;
  data: string;
  autore: string | null;
  autoreId: string | null;
  commessa: { id: string; codice: string | null; titolo: string } | null;
};

const STATI_FASE_CHIUSI = ["completata", "annullata", "sospesa"];

/** Giorni tra due date AAAA-MM-GG (b - a) */
function giorniTra(a: string, b: string) {
  const [ya, ma, da] = a.slice(0, 10).split("-").map(Number);
  const [yb, mb, db] = b.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

function piuGiorni(iso: string, giorni: number) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + giorni)).toISOString().slice(0, 10);
}

const giorni = (n: number) => (n === 1 ? "1 giorno" : `${n} giorni`);

function tra(n: number) {
  if (n <= 0) return "oggi";
  if (n === 1) return "domani";
  return `tra ${giorni(n)}`;
}

function etichettaPratica(numero: string | null, titolo: string | null) {
  return [numero, titolo].filter(Boolean).join(" · ") || "Senza titolo";
}

export async function leggiDaFare(oggi: string): Promise<VoceDaFare[]> {
  const supabase = await createClient();
  const limiteFasi = piuGiorni(oggi, GIORNI_FINESTRA_FASI);

  const [fasi, preventivi, prefattibilita] = await Promise.all([
    supabase
      .from("commesse_fasi")
      .select("id, nome, stato, data_fine_prev, responsabile_id, commessa:commesse!inner(id, codice, titolo, stato, responsabile_id, cliente:clienti(denominazione))")
      .not("data_fine_prev", "is", null)
      .lte("data_fine_prev", limiteFasi)
      .not("stato", "in", `(${STATI_FASE_CHIUSI.join(",")})`)
      .eq("commessa.stato", "attiva"),
    supabase
      .from("preventivi")
      .select("id, numero, titolo, oggetto, stato, data_invio, data_emissione, created_at, validita_giorni, responsabile_id, prefattibilita_id, cliente:clienti(denominazione)")
      .in("stato", ["inviato", "bozza"]),
    supabase
      .from("prefattibilita")
      .select("id, numero, titolo, stato, updated_at, responsabile_id, preventivo_id, commessa_id, cliente:clienti(denominazione)")
      .eq("stato", "consegnata")
      .is("preventivo_id", null)
      .is("commessa_id", null),
  ]);

  if (fasi.error) throw new Error(`Impossibile leggere le fasi: ${fasi.error.message}`);
  if (preventivi.error) throw new Error(`Impossibile leggere i preventivi: ${preventivi.error.message}`);
  if (prefattibilita.error) throw new Error(`Impossibile leggere le pre-fattibilità: ${prefattibilita.error.message}`);

  const voci: VoceDaFare[] = [];

  // Fasi di commesse in corso: in ritardo o in scadenza
  for (const f of fasi.data ?? []) {
    const c = f.commessa;
    if (!c || !f.data_fine_prev) continue;
    const mancano = giorniTra(oggi, f.data_fine_prev);
    const scheda = `/commesse/${c.id}`;
    const contesto = ["Fase", [c.codice, c.titolo].filter(Boolean).join(" · "), c.cliente?.denominazione].filter(Boolean).join(" · ");
    voci.push({
      id: `fase-${f.id}`,
      gruppo: mancano < 0 ? "ritardo" : "presto",
      tipo: "fase",
      peso: mancano,
      titolo: f.nome,
      contesto,
      quando: mancano < 0 ? `scaduta da ${giorni(-mancano)}` : `scade ${tra(mancano)}`,
      tono: mancano < 0 ? "allarme" : mancano <= 3 ? "attenzione" : "neutro",
      scheda,
      azione: { etichetta: "Apri", href: scheda },
      responsabileId: f.responsabile_id ?? c.responsabile_id,
    });
  }

  for (const p of preventivi.data ?? []) {
    const scheda = `/preventivi/${p.id}`;
    const nome = etichettaPratica(p.numero, p.titolo ?? p.oggetto);
    const cliente = p.cliente?.denominazione;

    if (p.stato === "bozza") {
      const da = giorniTra((p.data_emissione ?? p.created_at).slice(0, 10), oggi);
      voci.push({
        id: `bozza-${p.id}`,
        gruppo: "avanzare",
        tipo: "bozza",
        peso: -da,
        titolo: "Bozza di preventivo da inviare",
        contesto: [nome, cliente].filter(Boolean).join(" · "),
        quando: da <= 0 ? "creata oggi" : `da ${giorni(da)}`,
        tono: "neutro",
        scheda,
        azione: { etichetta: "Apri", href: scheda },
        responsabileId: p.responsabile_id,
      });
      continue;
    }

    // Inviato: senza data di invio non si può dire da quanto aspetta
    if (!p.data_invio) continue;
    const attesa = giorniTra(p.data_invio.slice(0, 10), oggi);
    const scadenza = piuGiorni(p.data_invio, p.validita_giorni ?? 30);
    const alla = giorniTra(oggi, scadenza);
    if (alla < 0) {
      voci.push({
        id: `prev-${p.id}`,
        gruppo: "ritardo",
        tipo: "preventivo",
        peso: alla,
        titolo: `Preventivo ${p.numero ?? ""} senza risposta`.replace("  ", " "),
        contesto: [p.titolo ?? p.oggetto, cliente, `inviato ${giorni(attesa)} fa`].filter(Boolean).join(" · "),
        quando: "validità scaduta",
        tono: "allarme",
        scheda,
        azione: { etichetta: "Sollecita", href: scheda },
        responsabileId: p.responsabile_id,
      });
    } else if (attesa >= GIORNI_SOLLECITO) {
      voci.push({
        id: `prev-${p.id}`,
        gruppo: "presto",
        tipo: "preventivo",
        peso: alla,
        titolo: `Preventivo ${p.numero ?? ""} senza risposta`.replace("  ", " "),
        contesto: [p.titolo ?? p.oggetto, cliente, `inviato ${giorni(attesa)} fa`].filter(Boolean).join(" · "),
        quando: `validità scade ${tra(alla)}`,
        tono: alla <= 3 ? "attenzione" : "neutro",
        scheda,
        azione: { etichetta: "Sollecita", href: scheda },
        responsabileId: p.responsabile_id,
      });
    }
  }

  // Pre-fattibilità consegnate che non hanno ancora un preventivo
  for (const pf of prefattibilita.data ?? []) {
    const da = giorniTra(pf.updated_at.slice(0, 10), oggi);
    voci.push({
      id: `pf-${pf.id}`,
      gruppo: "avanzare",
      tipo: "prefattibilita",
      peso: -da,
      titolo: "Pre-fattibilità consegnata, manca il preventivo",
      contesto: [etichettaPratica(pf.numero, pf.titolo), pf.cliente?.denominazione].filter(Boolean).join(" · "),
      quando: da <= 0 ? "consegnata oggi" : `da ${giorni(da)}`,
      tono: "neutro",
      scheda: `/prefattibilita/${pf.id}`,
      azione: { etichetta: "Prepara preventivo", href: `/nuova/preventivo?da=${pf.id}` },
      responsabileId: pf.responsabile_id,
    });
  }

  const ordineGruppi: Record<GruppoDaFare, number> = { ritardo: 0, presto: 1, avanzare: 2 };
  return voci.sort((a, b) => ordineGruppi[a.gruppo] - ordineGruppi[b.gruppo] || a.peso - b.peso);
}

/** Ultime voci del diario di tutte le commesse. */
export async function ultimeAttivita(quante = 6): Promise<AttivitaRecente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commesse_diario")
    .select("id, tipo, testo, data_evento, created_at, autore_id, autore:profili(nome, cognome), commessa:commesse(id, codice, titolo)")
    .order("created_at", { ascending: false })
    .limit(quante);
  if (error) throw new Error(`Impossibile leggere il diario: ${error.message}`);
  return (data ?? []).map((d) => ({
    id: d.id,
    tipo: d.tipo,
    testo: d.testo,
    data: d.created_at,
    autore: d.autore ? d.autore.nome : null,
    autoreId: d.autore_id,
    commessa: d.commessa ? { id: d.commessa.id, codice: d.commessa.codice, titolo: d.commessa.titolo } : null,
  }));
}
