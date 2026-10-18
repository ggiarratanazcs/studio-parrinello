/** Calcoli di un preventivo professionale (onorario, cassa previdenziale, IVA, ritenuta). */

export type VoceCalcolo = { importo: number; opzionale?: boolean };
export type Percentuali = { sconto: number; spese: number; cassa: number; iva: number; ritenuta: number };

export const METODI_CALCOLO: Record<string, string> = {
  a_corpo: "A corpo",
  percentuale_lavori: "Percentuale sull'importo lavori",
  a_ore: "A ore (vacazione)",
  dm_17_06_2016: "Parametri DM 17/06/2016",
  misto: "Misto",
};

export const STATI_PREVENTIVO: Record<string, { etichetta: string; colore: string }> = {
  bozza: { etichetta: "Bozza", colore: "var(--stato-contatto)" },
  inviato: { etichetta: "Inviato", colore: "var(--stato-preventivo)" },
  accettato: { etichetta: "Accettato", colore: "var(--stato-attiva)" },
  rifiutato: { etichetta: "Rifiutato", colore: "var(--stato-sospesa)" },
  superato: { etichetta: "Superato", colore: "var(--stato-contatto)" },
};

export const STATI_PREFATTIBILITA: Record<string, { etichetta: string; colore: string }> = {
  in_corso: { etichetta: "In corso", colore: "var(--stato-prefattibilita)" },
  consegnata: { etichetta: "Consegnata", colore: "var(--stato-preventivo)" },
  convertita: { etichetta: "Convertita", colore: "var(--stato-attiva)" },
  archiviata: { etichetta: "Archiviata", colore: "var(--stato-contatto)" },
};

export const CONDIZIONI_PREDEFINITE =
  "30% all'affidamento dell'incarico, 40% al deposito del titolo edilizio, 30% alla fine dei lavori.";

const arrotonda = (n: number) => Math.round(n * 100) / 100;

export function calcolaTotali(voci: VoceCalcolo[], p: Percentuali) {
  const subtotale = voci.filter((v) => !v.opzionale).reduce((s, v) => s + (v.importo || 0), 0);
  const sconto = (subtotale * p.sconto) / 100;
  const spese = ((subtotale - sconto) * p.spese) / 100;
  const imponibile = subtotale - sconto + spese;
  const cassa = (imponibile * p.cassa) / 100;
  const iva = ((imponibile + cassa) * p.iva) / 100;
  const totale = imponibile + cassa + iva;
  const ritenuta = (imponibile * p.ritenuta) / 100;
  return {
    subtotale: arrotonda(subtotale),
    sconto: arrotonda(sconto),
    spese: arrotonda(spese),
    imponibile: arrotonda(imponibile),
    cassa: arrotonda(cassa),
    iva: arrotonda(iva),
    totale: arrotonda(totale),
    ritenuta: arrotonda(ritenuta),
    netto: arrotonda(totale - ritenuta),
  };
}

/** Valore numerico da un campo (accetta anche la virgola come separatore decimale). */
export function numero(testo: string | number | null | undefined) {
  if (typeof testo === "number") return testo;
  const n = parseFloat(String(testo ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
