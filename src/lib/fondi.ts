/**
 * Fondi delle testate (modali e pagine): colore per tipo e disegno di sfondo delle pagine.
 * base = colore pieno, rgb = stesso colore per le velature, riflesso = tono chiaro verso destra,
 * chiaro = tono per il gradiente dei pulsanti, disegno = immagine della testata di pagina.
 */
const fondo = (tipo: string, disegno: string) => ({
  base: `var(--fondo-${tipo}-base)`,
  rgb: `var(--fondo-${tipo}-rgb)`,
  riflesso: `var(--fondo-${tipo}-riflesso)`,
  chiaro: `var(--fondo-${tipo}-chiaro)`,
  disegno,
});

/** I colori sono variabili CSS definite per ogni tema in globals.css (Caldo: oliva, bronzo, ardesia, antracite; Navy: quattro blu). */
export const FONDI = {
  // mappa di Ortigia
  commessa: fondo("commessa", "/brand/ortigia.webp"),
  // costruzione della spirale
  preventivo: fondo("preventivo", "/brand/spirale.svg"),
  // pianta del Castello Maniace
  prefattibilita: fondo("prefattibilita", "/brand/castello.webp"),
  // pianta del Teatro Greco (home e anagrafiche)
  studio: fondo("studio", "/brand/teatro.svg"),
} as const;

export type TipoFondo = keyof typeof FONDI;
