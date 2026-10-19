import "server-only";
import { commessaPerIntegrativo, leggiPrefattibilita } from "@/lib/dati";
import { TIPOLOGIE_INTERVENTO } from "@/lib/dominio";

/**
 * Da dove nasce un nuovo preventivo e con quali dati va precompilato:
 * da una pre-fattibilità (prosecuzione) o da una commessa (preventivo integrativo).
 */
export type OrigineNuovoPreventivo = {
  tipo: "prefattibilita" | "commessa";
  id: string;
  numero: string | null;
  cliente_id: string | null;
  immobile_id: string | null;
  titolo: string | null;
  committenza: string;
  tipologia_intervento: string | null;
  importo_lavori: number | null;
  responsabile_id: string | null;
  oggetto: string | null;
  /** Voci di partenza; null = proposta automatica dalle fasi tipiche dell'intervento */
  voci: { descrizione: string; prezzo?: string }[] | null;
} | null;

export async function origineNuovoPreventivo(fonte: { da?: string | null; commessa?: string | null }): Promise<OrigineNuovoPreventivo> {
  if (fonte.commessa) {
    const c = await commessaPerIntegrativo(fonte.commessa);
    if (!c) return null;
    return {
      tipo: "commessa",
      id: c.id,
      numero: c.codice,
      cliente_id: c.cliente_id,
      immobile_id: c.immobile_id,
      titolo: `Integrativo – ${c.titolo}`,
      committenza: c.committenza,
      tipologia_intervento: c.tipologia_intervento,
      importo_lavori: c.importo_lavori_stimato,
      responsabile_id: c.responsabile_id,
      oggetto: `Prestazioni professionali integrative alla commessa ${c.codice ?? ""} «${c.titolo}».`,
      voci: [{ descrizione: "" }],
    };
  }
  if (fonte.da) {
    const f = await leggiPrefattibilita(fonte.da);
    if (!f) return null;
    const intervento = TIPOLOGIE_INTERVENTO[f.tipologia_intervento ?? ""];
    return {
      tipo: "prefattibilita",
      id: f.id,
      numero: f.numero,
      cliente_id: f.cliente_id,
      immobile_id: f.immobile_id,
      titolo: f.titolo,
      committenza: f.committenza,
      tipologia_intervento: f.tipologia_intervento,
      importo_lavori: f.costo_opere_stimato,
      responsabile_id: f.responsabile_id,
      oggetto: [
        `Prestazioni professionali${intervento ? ` per ${intervento.toLowerCase()}` : ""}${f.titolo ? ` – ${f.titolo}` : ""}`,
        f.titolo_edilizio ? `, con titolo abilitativo ${f.titolo_edilizio}` : "",
        `, a seguito della pre-fattibilità ${f.numero ?? ""}.`,
      ].join(""),
      voci: null,
    };
  }
  return null;
}
