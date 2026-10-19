/** Conti sulle date "AAAA-MM-GG" per i cronoprogrammi, in giorni progressivi UTC (niente fusi orari). */
export const GIORNO = 86_400_000;
export const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

export const giorno = (iso: string) => Math.floor(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / GIORNO);
export const daGiorno = (g: number) => new Date(g * GIORNO);

/** "3 mar" */
export const breve = (iso: string | null) => {
  if (!iso) return "—";
  const d = daGiorno(giorno(iso));
  return `${d.getUTCDate()} ${MESI[d.getUTCMonth()].toLowerCase()}`;
};

/** Intervallo a mesi interi che contiene tutti i giorni dati, con l'elenco dei mesi per l'intestazione. */
export function intervalloMesi(giorni: number[]) {
  const minimo = daGiorno(Math.min(...giorni));
  const massimo = daGiorno(Math.max(...giorni));
  const inizio = Math.floor(Date.UTC(minimo.getUTCFullYear(), minimo.getUTCMonth(), 1) / GIORNO);
  const fine = Math.floor(Date.UTC(massimo.getUTCFullYear(), massimo.getUTCMonth() + 1, 1) / GIORNO);
  const mesi: { g: number; etichetta: string; anno: number }[] = [];
  for (let d = daGiorno(inizio); Math.floor(d.getTime() / GIORNO) < fine; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    mesi.push({ g: Math.floor(d.getTime() / GIORNO), etichetta: MESI[d.getUTCMonth()], anno: d.getUTCFullYear() });
  }
  return { inizio, fine, giorni: fine - inizio, mesi };
}
