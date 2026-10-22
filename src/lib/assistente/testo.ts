/** Strumenti di testo dell'assistente: normalizzazione e confronto tollerante agli errori di battitura. */

export function normalizza(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distanza(a: string, b: string) {
  const riga = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let precedente = riga[0];
    riga[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = riga[j];
      riga[j] = Math.min(riga[j] + 1, riga[j - 1] + 1, precedente + (a[i - 1] === b[j - 1] ? 0 : 1));
      precedente = temp;
    }
  }
  return riga[b.length];
}

/** Quanto una parola cercata somiglia a una parola del testo: 3 uguale, 2 inizio, 1 quasi uguale, 0 diversa. */
function somiglianza(cercata: string, parola: string) {
  if (cercata === parola) return 3;
  if (parola.startsWith(cercata)) return 2;
  if (cercata.length >= 4) {
    const tolleranza = cercata.length >= 7 ? 2 : 1;
    if (distanza(cercata, parola) <= tolleranza) return 1;
    if (parola.length > cercata.length && distanza(cercata, parola.slice(0, cercata.length)) <= 1) return 1;
  }
  return 0;
}

/** Punteggio di un testo rispetto alle parole cercate: 0 se anche una sola parola non si trova. */
export function punteggio(parole: string[], testo: string) {
  const parti = normalizza(testo).split(" ").filter(Boolean);
  let totale = 0;
  for (const p of parole) {
    let migliore = 0;
    for (const w of parti) migliore = Math.max(migliore, somiglianza(p, w));
    if (!migliore) return 0;
    totale += migliore;
  }
  return totale;
}

/** Parole che indicano una categoria di documento. */
export const CATEGORIE_DA_PAROLA: Record<string, string[]> = {
  visura: ["catastale"],
  visure: ["catastale"],
  catastale: ["catastale"],
  planimetria: ["catastale", "elaborato_grafico"],
  foto: ["foto_sopralluogo"],
  fotografie: ["foto_sopralluogo"],
  tavola: ["elaborato_grafico"],
  tavole: ["elaborato_grafico"],
  pianta: ["elaborato_grafico"],
  piante: ["elaborato_grafico"],
  prospetto: ["elaborato_grafico"],
  relazione: ["relazione"],
  relazioni: ["relazione"],
  rilievo: ["rilievo"],
  rilievi: ["rilievo"],
  computo: ["computo"],
  computi: ["computo"],
  render: ["render"],
  contratto: ["contratto_incarico"],
  incarico: ["contratto_incarico"],
  pec: ["corrispondenza"],
  scia: ["pratica_edilizia"],
  cila: ["pratica_edilizia"],
  pratica: ["pratica_edilizia"],
  preventivo: ["preventivo"],
};
