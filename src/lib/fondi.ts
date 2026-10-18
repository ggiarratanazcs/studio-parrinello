/**
 * Fondi delle testate (modali e pagine): colore per tipo e disegno di sfondo delle pagine.
 * base = colore pieno, rgb = stesso colore per le velature, riflesso = tono chiaro verso destra,
 * chiaro = tono per il gradiente dei pulsanti, disegno = immagine della testata di pagina.
 */
export const FONDI = {
  // oliva scuro · mappa di Ortigia
  commessa: { base: "#2f3a2b", rgb: "47,58,43", riflesso: "120,140,96", chiaro: "#55684a", disegno: "/brand/ortigia.webp" },
  // bronzo brunito · costruzione della spirale
  preventivo: { base: "#4a321c", rgb: "74,50,28", riflesso: "176,124,64", chiaro: "#7a5530", disegno: "/brand/spirale.svg" },
  // ardesia · pianta del Castello Maniace
  prefattibilita: { base: "#2b3540", rgb: "43,53,64", riflesso: "110,130,150", chiaro: "#4f6274", disegno: "/brand/castello.webp" },
  // antracite calda · pianta del Teatro Greco (home e anagrafiche)
  studio: { base: "#2e2b27", rgb: "46,43,39", riflesso: "150,120,88", chiaro: "#57504a", disegno: "/brand/teatro.svg" },
} as const;

export type TipoFondo = keyof typeof FONDI;
