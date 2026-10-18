import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { leggiPreventivo } from "@/lib/dati";
import { MONOGRAMMA_TRACCIATO, MONOGRAMMA_VIEWBOX } from "@/lib/monogramma-tracciato";
import { calcolaTotali, METODI_CALCOLO } from "@/lib/preventivo";
import { STUDIO } from "@/lib/studio";

type Preventivo = NonNullable<Awaited<ReturnType<typeof leggiPreventivo>>>;

/* Impaginazione A4 in punti tipografici */
const A4 = { l: 595.28, h: 841.89 };
const M = { sx: 56, dx: 56, alto: 56, basso: 64 };
const LARGHEZZA = A4.l - M.sx - M.dx;

const INCHIOSTRO = rgb(0.169, 0.165, 0.157);
const TENUE = rgb(0.43, 0.41, 0.37);
const LINEA = rgb(0.84, 0.8, 0.74);
const BRONZO = rgb(0.54, 0.35, 0.17);

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  useGrouping: "always",
} as Intl.NumberFormatOptions);
const data = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "long", year: "numeric" });

/**
 * Genera il PDF di un preventivo con un'impaginazione essenziale:
 * intestazione dello studio, committente, oggetto, voci, totali, condizioni e firma.
 */
export async function pdfPreventivo(p: Preventivo): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Preventivo ${p.numero ?? ""} — ${p.titolo ?? ""}`);
  doc.setAuthor(STUDIO.nome);
  doc.setCreator(STUDIO.nome);
  doc.setLanguage("it-IT");

  const normale = await doc.embedFont(StandardFonts.Helvetica);
  const grassetto = await doc.embedFont(StandardFonts.HelveticaBold);

  let pagina = doc.addPage([A4.l, A4.h]);
  let y = A4.h - M.alto;

  /* ── Strumenti di scrittura ── */
  // Le font standard coprono il set WinAnsi: i caratteri fuori set vengono sostituiti.
  const SOSTITUZIONI: Record<string, string> = { "→": "->", "←": "<-", "≥": ">=", "≤": "<=", "≠": "!=", " ": " ", " ": " ", "\t": "    " };
  const pulisci = (t: string, f: PDFFont) =>
    Array.from(t.replace(/\r/g, ""))
      .map((c) => SOSTITUZIONI[c] ?? c)
      .map((c) => {
        if (c === "\n") return c;
        try {
          f.encodeText(c);
          return c;
        } catch {
          return "?";
        }
      })
      .join("");

  function aCapo(testo: string, f: PDFFont, dim: number, larghezza: number) {
    const righe: string[] = [];
    for (const paragrafo of pulisci(testo, f).split("\n")) {
      let riga = "";
      for (const parola of paragrafo.split(/\s+/)) {
        const prova = riga ? `${riga} ${parola}` : parola;
        if (f.widthOfTextAtSize(prova, dim) > larghezza && riga) {
          righe.push(riga);
          riga = parola;
        } else riga = prova;
      }
      righe.push(riga);
    }
    return righe;
  }

  function nuovaPaginaSeServe(altezza: number) {
    if (y - altezza < M.basso) {
      pagina = doc.addPage([A4.l, A4.h]);
      y = A4.h - M.alto;
    }
  }

  function scrivi(testo: string, o: { x?: number; dim?: number; f?: PDFFont; colore?: ReturnType<typeof rgb>; larghezza?: number; interlinea?: number } = {}) {
    const f = o.f ?? normale;
    const dim = o.dim ?? 10;
    const interlinea = o.interlinea ?? dim * 1.4;
    for (const riga of aCapo(testo, f, dim, o.larghezza ?? LARGHEZZA)) {
      nuovaPaginaSeServe(interlinea);
      pagina.drawText(riga, { x: o.x ?? M.sx, y: y - dim, size: dim, font: f, color: o.colore ?? INCHIOSTRO });
      y -= interlinea;
    }
  }

  function aDestra(testo: string, xDestra: number, yBase: number, dim: number, f: PDFFont, colore = INCHIOSTRO) {
    const t = pulisci(testo, f);
    pagina.drawText(t, { x: xDestra - f.widthOfTextAtSize(t, dim), y: yBase, size: dim, font: f, color: colore });
  }

  function linea(spessore = 0.6, colore = LINEA) {
    pagina.drawLine({ start: { x: M.sx, y }, end: { x: A4.l - M.dx, y }, thickness: spessore, color: colore });
  }

  function etichetta(testo: string) {
    nuovaPaginaSeServe(28);
    y -= 6;
    scrivi(testo.toUpperCase(), { dim: 7.5, f: grassetto, colore: TENUE, interlinea: 13 });
  }

  /* ── Intestazione dello studio ── */
  const scala = 40 / MONOGRAMMA_VIEWBOX.altezza;
  pagina.drawSvgPath(MONOGRAMMA_TRACCIATO, {
    x: M.sx - MONOGRAMMA_VIEWBOX.x * scala,
    y: y + MONOGRAMMA_VIEWBOX.y * scala,
    scale: scala,
    color: INCHIOSTRO,
  });
  pagina.drawText(STUDIO.nome, { x: M.sx + 38, y: y - 16, size: 14, font: grassetto, color: INCHIOSTRO });
  pagina.drawText(STUDIO.sottotitolo, { x: M.sx + 38, y: y - 30, size: 8.5, font: normale, color: TENUE });
  const contatti = [STUDIO.indirizzo, `${STUDIO.telefono}  ·  ${STUDIO.email}`, STUDIO.sito, STUDIO.partitaIva ? `P.IVA ${STUDIO.partitaIva}` : ""].filter(Boolean);
  contatti.forEach((c, i) => aDestra(c, A4.l - M.dx, y - 10 - i * 11, 8, normale, TENUE));
  y -= 58;
  linea(1.2, INCHIOSTRO);
  y -= 22;

  /* ── Titolo del documento ── */
  const emissione = new Date(p.data_emissione);
  const scadenza = new Date(p.data_emissione);
  scadenza.setDate(scadenza.getDate() + p.validita_giorni);
  scrivi(`Preventivo ${p.numero ?? ""}`, { dim: 9, f: grassetto, colore: BRONZO });
  y -= 2;
  scrivi(p.titolo ?? "Preventivo", { dim: 18, f: grassetto, interlinea: 24 });
  scrivi(`Siracusa, ${data.format(emissione)}  ·  Valido fino al ${data.format(scadenza)}`, { dim: 9, colore: TENUE });
  y -= 14;

  /* ── Committente e immobile (due colonne) ── */
  const c = p.cliente;
  const colonna = (LARGHEZZA - 24) / 2;
  const yInizio = y;
  etichetta("Committente");
  const righeCliente = [
    c?.denominazione ?? "",
    [c?.indirizzo, [c?.cap, c?.comune, c?.provincia ? `(${c.provincia})` : ""].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    c?.partita_iva ? `P.IVA ${c.partita_iva}` : "",
    c?.codice_fiscale ? `C.F. ${c.codice_fiscale}` : "",
    c?.pec ? `PEC ${c.pec}` : c?.email ?? "",
    c?.codice_ipa ? `Codice IPA ${c.codice_ipa}` : c?.codice_sdi ? `Codice SDI ${c.codice_sdi}` : "",
  ].filter(Boolean);
  righeCliente.forEach((r, i) => scrivi(r, { dim: i === 0 ? 10.5 : 9, f: i === 0 ? grassetto : normale, larghezza: colonna }));
  const yFineSx = y;

  y = yInizio;
  const xDx = M.sx + colonna + 24;
  nuovaPaginaSeServe(28);
  y -= 6;
  pagina.drawText("IMMOBILE", { x: xDx, y: y - 7.5, size: 7.5, font: grassetto, color: TENUE });
  y -= 13;
  const imm = p.immobile;
  const righeImmobile = imm ? [imm.denominazione ?? "", [imm.indirizzo, imm.comune].filter(Boolean).join(", ")].filter(Boolean) : ["Da definire"];
  righeImmobile.forEach((r, i) => scrivi(r, { x: xDx, dim: i === 0 ? 10.5 : 9, f: i === 0 ? grassetto : normale, larghezza: colonna }));
  y = Math.min(y, yFineSx) - 10;

  /* ── Oggetto ── */
  if (p.oggetto) {
    etichetta("Oggetto della prestazione");
    scrivi(p.oggetto, { dim: 10, interlinea: 14.5 });
    y -= 6;
  }

  /* ── Voci ── */
  etichetta(`Prestazioni  ·  ${METODI_CALCOLO[p.metodo_calcolo] ?? ""}`);
  y -= 2;
  linea(0.8, INCHIOSTRO);
  y -= 4;
  const xImporto = A4.l - M.dx;
  const larghezzaDescrizione = LARGHEZZA - 110;
  (p.voci ?? []).forEach((v, i) => {
    const righe = aCapo(v.descrizione, normale, 10, larghezzaDescrizione);
    const altezza = righe.length * 14 + (v.ore_stimate || v.opzionale ? 12 : 0) + 12;
    nuovaPaginaSeServe(altezza);
    y -= 8;
    pagina.drawText(String(i + 1).padStart(2, "0"), { x: M.sx, y: y - 10, size: 8.5, font: normale, color: TENUE });
    righe.forEach((r, k) => pagina.drawText(r, { x: M.sx + 24, y: y - 10 - k * 14, size: 10, font: normale, color: INCHIOSTRO }));
    aDestra(euro.format(v.importo ?? 0), xImporto, y - 10, 10, normale);
    y -= righe.length * 14;
    if (v.ore_stimate || v.opzionale) {
      const nota = [v.ore_stimate ? `${v.ore_stimate} ore stimate` : "", v.opzionale ? "voce opzionale, esclusa dal totale" : ""].filter(Boolean).join("  ·  ");
      pagina.drawText(pulisci(nota, normale), { x: M.sx + 24, y: y - 9, size: 8, font: normale, color: TENUE });
      y -= 12;
    }
    y -= 4;
    linea();
  });

  /* ── Totali ── */
  const t = calcolaTotali(
    (p.voci ?? []).map((v) => ({ importo: v.importo ?? 0, opzionale: v.opzionale })),
    { sconto: p.sconto_pct ?? 0, spese: p.spese_pct ?? 0, cassa: p.cassa_pct, iva: p.iva_pct, ritenuta: p.ritenuta_pct ?? 0 },
  );
  const righeTotali: [string, number, boolean?][] = [
    ["Totale prestazioni", t.subtotale],
    ...(t.sconto ? ([[`Sconto ${p.sconto_pct}%`, -t.sconto]] as [string, number][]) : []),
    ...(t.spese ? ([[`Spese e oneri accessori ${p.spese_pct}%`, t.spese]] as [string, number][]) : []),
    ["Imponibile", t.imponibile],
    [`Contributo integrativo cassa ${p.cassa_pct}%`, t.cassa],
    [`IVA ${p.iva_pct}%`, t.iva],
    ["Totale documento", t.totale, true],
    ...(t.ritenuta ? ([[`Ritenuta d'acconto ${p.ritenuta_pct}%`, -t.ritenuta], ["Netto a pagare", t.netto, true]] as [string, number, boolean][]) : []),
  ];
  nuovaPaginaSeServe(righeTotali.length * 16 + 20);
  y -= 12;
  const xEtichette = A4.l - M.dx - 250;
  for (const [nome, valore, forte] of righeTotali) {
    if (forte) {
      pagina.drawLine({ start: { x: xEtichette, y: y + 2 }, end: { x: xImporto, y: y + 2 }, thickness: 0.8, color: INCHIOSTRO });
      y -= 4;
    }
    const f = forte ? grassetto : normale;
    pagina.drawText(pulisci(nome, f), { x: xEtichette, y: y - 10, size: forte ? 10.5 : 9.5, font: f, color: forte ? INCHIOSTRO : TENUE });
    aDestra(euro.format(valore), xImporto, y - 10, forte ? 10.5 : 9.5, f);
    y -= 16;
  }
  y -= 8;

  /* ── Condizioni e note ── */
  if (p.condizioni_pagamento) {
    etichetta("Condizioni di pagamento");
    scrivi(p.condizioni_pagamento, { dim: 9.5, interlinea: 14 });
  }
  if (p.note) {
    etichetta("Note");
    scrivi(p.note, { dim: 9.5, interlinea: 14 });
  }
  etichetta("Validità");
  scrivi(`L'offerta è valida ${p.validita_giorni} giorni dalla data di emissione.`, { dim: 9.5 });

  /* ── Firme ── */
  nuovaPaginaSeServe(90);
  y -= 36;
  const larghezzaFirma = 190;
  const responsabile = p.responsabile ? `${p.responsabile.qualifica ? `${p.responsabile.qualifica} ` : ""}${p.responsabile.nome} ${p.responsabile.cognome}`.trim() : STUDIO.nome;
  pagina.drawText("Per lo studio", { x: M.sx, y, size: 8, font: normale, color: TENUE });
  pagina.drawText("Per accettazione, il committente", { x: A4.l - M.dx - larghezzaFirma, y, size: 8, font: normale, color: TENUE });
  y -= 34;
  pagina.drawLine({ start: { x: M.sx, y }, end: { x: M.sx + larghezzaFirma, y }, thickness: 0.6, color: INCHIOSTRO });
  pagina.drawLine({ start: { x: A4.l - M.dx - larghezzaFirma, y }, end: { x: A4.l - M.dx, y }, thickness: 0.6, color: INCHIOSTRO });
  pagina.drawText(pulisci(responsabile, normale), { x: M.sx, y: y - 12, size: 8.5, font: normale, color: INCHIOSTRO });

  /* ── Piè di pagina su tutte le pagine ── */
  const pagine = doc.getPages();
  pagine.forEach((pg: PDFPage, i) => {
    const testo = pulisci(`${STUDIO.nome}  ·  Preventivo ${p.numero ?? ""}  ·  Pagina ${i + 1} di ${pagine.length}`, normale);
    pg.drawLine({ start: { x: M.sx, y: 44 }, end: { x: A4.l - M.dx, y: 44 }, thickness: 0.5, color: LINEA });
    pg.drawText(testo, { x: M.sx, y: 30, size: 7.5, font: normale, color: TENUE });
  });

  return doc.save();
}
