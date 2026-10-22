/**
 * Interprete dei comandi dell'assistente: dalla frase scritta o dettata a una risposta con schede azione.
 * Funziona a regole (parole chiave + ricerca tollerante), senza servizi esterni.
 * È l'unico pezzo da sostituire per passare a un'intelligenza artificiale: stesso ingresso, stessa Risposta.
 */
import { STATI_COMMESSA } from "@/lib/dominio";
import { normalizza, punteggio } from "@/lib/assistente/testo";
import type { IndiceAssistente, Risposta, Scheda } from "@/lib/assistente/tipi";

type Contesto = { indice: IndiceAssistente; /** data di oggi, aaaa-mm-gg */ oggi: string };

const PAROLE_VUOTE = new Set([
  "a", "ad", "al", "alla", "allo", "ai", "agli", "alle", "il", "lo", "la", "i", "gli", "le", "l", "un", "una", "uno",
  "di", "del", "della", "dello", "dei", "degli", "delle", "da", "dal", "dalla", "e", "ed", "per", "con", "su", "mi", "me",
  "sig", "signor", "signore", "signora", "sigra", "dott", "dottor", "dottore", "dottoressa", "ing", "ingegnere", "arch",
  "architetto", "avv", "avvocato", "geom", "geometra", "cliente", "committente", "mio", "mia", "nostro", "nostra",
  "per favore", "favore", "puoi", "potresti", "vorrei", "voglio",
]);

const TESTO_AIUTO =
  "Posso aiutarti così:\n• «chiama Rossi» — numero del cliente o dei referenti\n• «scrivi a Bianchi per il sopralluogo di giovedì» — bozza di mail\n• «commessa 2026-004» o «apri Villa M.» — apre la scheda\n• «trova visura Palazzo Bonanno» — cerca nell'archivio\n• «fasi in scadenza» o «in ritardo» — scadenze delle fasi\n• «commesse sospese» — commesse per stato";

function parole(testo: string) {
  return normalizza(testo)
    .split(" ")
    .filter((p) => p && !PAROLE_VUOTE.has(p));
}

function migliori<T>(elenco: T[], cercate: string[], testo: (x: T) => string, quanti = 5) {
  if (!cercate.length) return [];
  const conPunti = elenco.map((x) => ({ x, p: punteggio(cercate, testo(x)) })).filter((r) => r.p > 0);
  conPunti.sort((a, b) => b.p - a.p);
  if (!conPunti.length) return [];
  // Se c'è una corrispondenza netta tiene solo quelle allo stesso livello
  const massimo = conPunti[0].p;
  return conPunti.filter((r) => r.p >= massimo - 1).slice(0, quanti).map((r) => r.x);
}

/** "il sopralluogo" → "al sopralluogo", "la pratica" → "alla pratica"… */
function inMeritoA(argomento: string) {
  const preposizioni: [RegExp, string][] = [
    [/^il\s+/i, "al "], [/^lo\s+/i, "allo "], [/^la\s+/i, "alla "], [/^l'\s*/i, "all'"],
    [/^i\s+/i, "ai "], [/^gli\s+/i, "agli "], [/^le\s+/i, "alle "],
  ];
  for (const [regola, sostituto] of preposizioni) if (regola.test(argomento)) return argomento.replace(regola, sostituto);
  return `a ${argomento}`;
}

const maiuscola = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const dataBreve = (iso: string) => {
  const [a, m, g] = iso.slice(0, 10).split("-");
  return `${g}.${m}.${a.slice(2)}`;
};

/* ── Persone da chiamare o a cui scrivere: clienti e referenti ─────────────── */

type Persona = { nome: string; cliente: IndiceAssistente["clienti"][number]; ruolo?: string | null; telefono: string | null; email: string | null };

function persone(indice: IndiceAssistente): Persona[] {
  return indice.clienti.flatMap((c) => [
    { nome: c.nome, cliente: c, telefono: c.telefono, email: c.email },
    ...c.referenti.map((r) => ({ nome: r.nome, cliente: c, ruolo: r.ruolo, telefono: r.telefono, email: r.email })),
  ]);
}

function trovaPersone(indice: IndiceAssistente, cercate: string[]) {
  return migliori(persone(indice), cercate, (p) => `${p.nome} ${p.nome === p.cliente.nome ? "" : p.cliente.nome}`, 4);
}

function chiama(ctx: Contesto, resto: string): Risposta {
  const cercate = parole(resto);
  if (!cercate.length) return { testo: "Chi devo chiamare?", schede: [] };
  const trovate = trovaPersone(ctx.indice, cercate);
  if (!trovate.length) return { testo: `Non trovo nessun cliente o referente che corrisponda a «${resto.trim()}».`, schede: [] };

  // Raggruppa per cliente: il numero del cliente e quelli dei referenti trovati
  const perCliente = new Map<string, Scheda & { tipo: "telefono" }>();
  for (const p of trovate) {
    const id = p.cliente.id;
    const scheda = perCliente.get(id) ?? {
      tipo: "telefono" as const,
      titolo: p.cliente.nome,
      sottotitolo: [p.cliente.comune, `${ctx.indice.commesse.filter((c) => c.clienteId === id).length} commesse`].filter(Boolean).join(" · "),
      numeri: [],
      href: `/clienti/${id}`,
    };
    if (p.telefono && !scheda.numeri.some((n) => n.numero === p.telefono)) {
      scheda.numeri.push({ etichetta: p.nome === p.cliente.nome ? "Cliente" : [p.nome, p.ruolo].filter(Boolean).join(" · "), numero: p.telefono });
    }
    perCliente.set(id, scheda);
  }
  const schede = [...perCliente.values()];
  const senzaNumero = schede.every((s) => !s.numeri.length);
  return {
    testo: senzaNumero
      ? "Ho trovato il cliente ma non c'è un numero di telefono in anagrafica."
      : schede.length > 1
        ? "Ho trovato più corrispondenze, scegli chi chiamare:"
        : "Tocca il numero per chiamare.",
    schede,
  };
}

/* ── Bozza di mail ─────────────────────────────────────────────────────────── */

function scrivi(ctx: Contesto, resto: string): Risposta {
  // "Bianchi per il sopralluogo di giovedì": prima il destinatario, poi l'argomento
  const n = normalizza(resto);
  const separatore = n.match(/\s(per|riguardo|circa|sul|sulla|sui|sugli|sulle|in merito|che|dicendo)\s/);
  const chi = separatore ? n.slice(0, separatore.index) : n;
  let argomento = "";
  if (separatore) {
    // Riprende l'argomento dal testo originale (con maiuscole e accenti) quando possibile
    const posizione = resto.toLowerCase().indexOf(` ${separatore[1]} `);
    argomento = (posizione >= 0 ? resto.slice(posizione + separatore[1].length + 2) : n.slice((separatore.index ?? 0) + separatore[0].length)).trim();
  }
  const cercate = parole(chi);
  if (!cercate.length) return { testo: "A chi devo scrivere?", schede: [] };
  const trovate = trovaPersone(ctx.indice, cercate).filter((p) => p.email);
  if (!trovate.length) {
    const qualcuno = trovaPersone(ctx.indice, cercate)[0];
    return qualcuno
      ? {
          testo: `${qualcuno.nome} non ha un indirizzo email in anagrafica.`,
          schede: [{ tipo: "voce", icona: "cliente", titolo: qualcuno.cliente.nome, sottotitolo: "Apri la scheda per aggiungerlo", href: `/clienti/${qualcuno.cliente.id}` }],
        }
      : { testo: `Non trovo nessun cliente o referente che corrisponda a «${chi}».`, schede: [] };
  }

  // Una commessa citata nell'argomento finisce nell'oggetto
  const commessa = argomento
    ? ctx.indice.commesse.find((c) => c.codice && normalizza(argomento).includes(normalizza(c.codice)))
    : undefined;
  const schede: Scheda[] = trovate.slice(0, 3).map((p) => {
    const persona = p.nome !== p.cliente.nome || p.cliente.persona;
    const saluto = persona ? `Gentile ${p.nome}` : `Spett.le ${p.nome}`;
    const frase = argomento
      ? argomento.match(/^(confermo|ti |le |vi |volevo|ricordo|invio|allego)/i)
        ? `${maiuscola(argomento)}.`
        : `Le scrivo in merito ${inMeritoA(argomento)}.`
      : "";
    const corpo = [`${saluto},`, "", frase, "", "Resto a disposizione per ogni chiarimento.", "", "Cordiali saluti,", ctx.indice.utente, ctx.indice.studio]
      .filter((r, i, a) => !(r === "" && a[i - 1] === ""))
      .join("\n");
    const oggetto = commessa
      ? `Commessa ${commessa.codice} · ${commessa.titolo}`
      : argomento
        ? maiuscola(argomento.replace(/^(il|lo|la|i|gli|le)\s+|^l'/i, ""))
        : ctx.indice.studio;
    return { tipo: "mail", a: p.email!, destinatario: p.nome === p.cliente.nome ? p.nome : `${p.nome} (${p.cliente.nome})`, oggetto, corpo, href: `/clienti/${p.cliente.id}` };
  });
  return {
    testo: schede.length > 1 ? "Ho preparato una bozza per ciascuna corrispondenza: scegli quella giusta e correggila se serve." : "Ecco la bozza: correggila se serve e aprila nella tua posta.",
    schede,
  };
}

/* ── Schede da aprire: commesse, clienti, immobili ─────────────────────────── */

function voceCommessa(c: IndiceAssistente["commesse"][number]): Scheda {
  return {
    tipo: "voce",
    icona: "commessa",
    titolo: [c.codice, c.titolo].filter(Boolean).join(" · "),
    sottotitolo: [STATI_COMMESSA[c.stato as keyof typeof STATI_COMMESSA]?.etichetta, c.cliente, c.immobile].filter(Boolean).join(" · "),
    href: `/commesse/${c.id}`,
  };
}

function trovaCommesse(ctx: Contesto, cercate: string[]) {
  return migliori(ctx.indice.commesse, cercate, (c) => `${c.codice ?? ""} ${c.titolo} ${c.cliente ?? ""} ${c.immobile ?? ""}`);
}

function apriCommessa(ctx: Contesto, resto: string): Risposta {
  const cercate = parole(resto);
  if (!cercate.length) return { testo: "Quale commessa? Scrivi il codice, il titolo o il cliente.", schede: [] };
  const trovate = trovaCommesse(ctx, cercate);
  return trovate.length
    ? { testo: trovate.length > 1 ? "Ho trovato queste commesse:" : "Eccola:", schede: trovate.map(voceCommessa) }
    : { testo: `Nessuna commessa corrisponde a «${resto.trim()}».`, schede: [] };
}

function apriCliente(ctx: Contesto, resto: string): Risposta {
  const trovati = migliori(ctx.indice.clienti, parole(resto), (c) => `${c.nome} ${c.referenti.map((r) => r.nome).join(" ")}`);
  return trovati.length
    ? {
        testo: trovati.length > 1 ? "Ho trovato questi clienti:" : "Eccolo:",
        schede: trovati.map((c) => ({ tipo: "voce", icona: "cliente", titolo: c.nome, sottotitolo: [c.comune, c.telefono].filter(Boolean).join(" · "), href: `/clienti/${c.id}` })),
      }
    : { testo: `Nessun cliente corrisponde a «${resto.trim()}».`, schede: [] };
}

function apriImmobile(ctx: Contesto, resto: string): Risposta {
  const trovati = migliori(ctx.indice.immobili, parole(resto), (i) => `${i.nome} ${i.indirizzo}`);
  return trovati.length
    ? {
        testo: trovati.length > 1 ? "Ho trovato questi immobili:" : "Eccolo:",
        schede: trovati.map((i) => ({ tipo: "voce", icona: "immobile", titolo: i.nome, sottotitolo: i.indirizzo, href: `/immobili/${i.id}` })),
      }
    : { testo: `Nessun immobile corrisponde a «${resto.trim()}».`, schede: [] };
}

/* ── Scadenze delle fasi e commesse per stato ──────────────────────────────── */

function scadenze(ctx: Contesto, n: string): Risposta {
  const soloRitardo = /ritard|scadut/.test(n) && !/scadenz|scadono/.test(n);
  const giorni = /oggi/.test(n) ? 0 : /domani/.test(n) ? 1 : /mese|30/.test(n) ? 30 : /settiman|7/.test(n) ? 7 : 14;
  const limite = new Date(`${ctx.oggi}T12:00:00`);
  limite.setDate(limite.getDate() + giorni);
  const fino = limite.toISOString().slice(0, 10);
  const fasi = ctx.indice.fasi
    .filter((f) => (soloRitardo ? f.fine < ctx.oggi : f.fine <= fino))
    .sort((a, b) => a.fine.localeCompare(b.fine));
  if (!fasi.length) {
    return { testo: soloRitardo ? "Nessuna fase in ritardo." : `Nessuna fase in scadenza nei prossimi ${giorni || 1} giorni.`, schede: [] };
  }
  const ritardo = fasi.filter((f) => f.fine < ctx.oggi).length;
  return {
    testo: soloRitardo
      ? `${fasi.length === 1 ? "1 fase è" : `${fasi.length} fasi sono`} in ritardo:`
      : `${fasi.length === 1 ? "1 fase" : `${fasi.length} fasi`} entro ${giorni === 0 ? "oggi" : `${giorni} giorni`}${ritardo ? `, di cui ${ritardo} già in ritardo` : ""}:`,
    schede: fasi.slice(0, 12).map((f) => ({
      tipo: "voce",
      icona: "fase",
      titolo: `${f.commessa} › ${f.nome}`,
      sottotitolo: `Avanzamento ${f.avanzamento}%`,
      href: `/commesse/${f.commessaId}`,
      nota: dataBreve(f.fine),
      allarme: f.fine < ctx.oggi,
    })),
  };
}

const STATI_DA_PAROLA: [RegExp, string][] = [
  [/sospes/, "sospesa"],
  [/in corso|attiv|aperte/, "attiva"],
  [/conclus|chius/, "conclusa"],
  [/annullat/, "annullata"],
  [/preventiv/, "preventivo"],
  [/prefattibil|pre fattibil/, "prefattibilita"],
];

function commessePerStato(ctx: Contesto, stato: string): Risposta {
  const trovate = ctx.indice.commesse.filter((c) => c.stato === stato);
  const nome = STATI_COMMESSA[stato as keyof typeof STATI_COMMESSA]?.etichetta.toLowerCase() ?? stato;
  return trovate.length
    ? { testo: `${trovate.length === 1 ? "1 commessa" : `${trovate.length} commesse`} in stato «${nome}»:`, schede: trovate.slice(0, 12).map(voceCommessa) }
    : { testo: `Nessuna commessa in stato «${nome}».`, schede: [] };
}

/* ── Ingresso ──────────────────────────────────────────────────────────────── */

export function interpreta(frase: string, ctx: Contesto): Risposta {
  const originale = frase.trim();
  const n = normalizza(originale);
  if (!n) return { testo: TESTO_AIUTO, schede: [] };

  if (/^(aiuto|help|\?|cosa (sai|puoi) fare|comandi|come funzioni)/.test(n)) return { testo: TESTO_AIUTO, schede: [] };

  // Telefonate
  let m = n.match(/^(?:puoi |per favore )?(?:chiama(?:re|mi)?|telefona(?:re)?|fai una telefonata|numero(?: di telefono)?|telefono)\s+(?:a\s+|al\s+|alla\s+|ad\s+|di\s+|del\s+|della\s+)?(.*)$/);
  if (m) return chiama(ctx, m[1]);

  // Mail: "manda una mail a…", "scrivi a…", "email a…"
  m = originale.match(/^(?:puoi |per favore )?(?:(?:manda|invia|prepara|scrivi)(?:mi)?\s+)?(?:(?:una|un)\s+)?(?:mail|email|e-mail|messaggio|scrivi)?\s*(?:a|al|alla|ai|ad|allo)\s+(.+)$/i);
  if (m && /\b(mail|email|e-mail|messaggio|scrivi)\b/i.test(originale)) return scrivi(ctx, m[1]);

  // Scadenze delle fasi
  if (/scadenz|scadono|in ritardo|ritardi|scadut/.test(n)) return scadenze(ctx, n);

  // File e documenti
  m = n.match(/^(?:trova(?:mi)?|cerca(?:mi)?|apri|mostra(?:mi)?|dov e|dove)?\s*(?:il |la |lo |i |le |gli |l )?(file|documento|documenti|allegato|allegati|visura|visure|foto|fotografie|tavola|tavole|pianta|piante|relazione|relazioni|rilievo|rilievi|computo|render|contratto|incarico|planimetria|scia|cila)\b\s*(.*)$/);
  if (m) {
    const parola = ["file", "documento", "documenti", "allegato", "allegati"].includes(m[1]) ? "" : `${m[1]} `;
    const termine = `${parola}${m[2]}`.trim();
    if (!termine) return { testo: "Che file cerchi? Ad esempio «trova visura Villa M.».", schede: [] };
    return { testo: "Cerco nell'archivio…", schede: [], cercaDocumenti: termine };
  }

  // Commesse per stato
  if (/\bcommess/.test(n)) {
    for (const [regola, stato] of STATI_DA_PAROLA) if (regola.test(n)) return commessePerStato(ctx, stato);
  }

  // Aperture esplicite
  m = n.match(/^(?:apri |vai (?:a|alla|al) |mostra(?:mi)? )?(?:la )?commessa\s*(.*)$/);
  if (m) return apriCommessa(ctx, m[1]);
  m = n.match(/^(?:apri |vai (?:a|al) |mostra(?:mi)? )?(?:il )?cliente\s*(.*)$/);
  if (m) return apriCliente(ctx, m[1]);
  m = n.match(/^(?:apri |vai (?:a|al|all) |mostra(?:mi)? )?(?:l )?immobile\s*(.*)$/);
  if (m) return apriImmobile(ctx, m[1]);

  // Ricerca libera su commesse, clienti e immobili
  const resto = n.replace(/^(apri|vai a|vai al|vai alla|mostra|mostrami|cerca|trova|trovami)\s+/, "");
  const cercate = parole(resto);
  const commesse = trovaCommesse(ctx, cercate).slice(0, 3).map(voceCommessa);
  const clienti = migliori(ctx.indice.clienti, cercate, (c) => c.nome, 3).map(
    (c): Scheda => ({ tipo: "voce", icona: "cliente", titolo: c.nome, sottotitolo: [c.comune, c.telefono].filter(Boolean).join(" · "), href: `/clienti/${c.id}` }),
  );
  const immobili = migliori(ctx.indice.immobili, cercate, (i) => `${i.nome} ${i.indirizzo}`, 3).map(
    (i): Scheda => ({ tipo: "voce", icona: "immobile", titolo: i.nome, sottotitolo: i.indirizzo, href: `/immobili/${i.id}` }),
  );
  const schede = [...commesse, ...clienti, ...immobili];
  if (schede.length) return { testo: "Ecco cosa ho trovato:", schede };
  return { testo: `Non ho capito «${originale}». ${TESTO_AIUTO}`, schede: [] };
}
