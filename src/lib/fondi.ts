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
  // pianta del Teatro Greco (scambiata con la home, che ora ha la mappa di Ortigia)
  commessa: fondo("commessa", "/brand/teatro.svg"),
  // costruzione della spirale
  preventivo: fondo("preventivo", "/brand/spirale.svg"),
  // pianta del Castello Maniace
  prefattibilita: fondo("prefattibilita", "/brand/castello.webp"),
  // pianta del Teatro Greco (anagrafiche; la home usa la mappa di Ortigia, vedi DISEGNO_HOME)
  studio: fondo("studio", "/brand/teatro.svg"),
} as const;

export type TipoFondo = keyof typeof FONDI;

/** Disegno della testata della home: la mappa di Ortigia (prima era delle commesse). */
export const DISEGNO_HOME = "/brand/ortigia.webp";

/** Disegno della testata dei Clienti: il tavolo di lavoro con i committenti, visto dall'alto. */
export const DISEGNO_CLIENTI = "/brand/riunione.webp";

/** Disegno della testata degli Immobili: schizzo prospettico di una casa a due volumi. */
export const DISEGNO_IMMOBILI = "/brand/casa.webp";
