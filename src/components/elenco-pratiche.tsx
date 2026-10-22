import { ArrowRightLeft, Layers, Percent } from "lucide-react";
import { PulsanteNuovo } from "@/components/tessere";
import { Cartiglio } from "@/components/cartiglio";
import { Pannello, Vuoto } from "@/components/ui";
import { TabellaPratiche } from "@/components/tabella-pratiche";
import type { Pratica } from "@/lib/dati";

const TESTI = {
  preventivo: {
    titolo: "Preventivi",
    sottotitolo: "Le offerte allo studio dei committenti. Un preventivo accettato si trasforma in commessa.",
    nuovo: "Nuovo",
    href: "/nuova/preventivo",
    base: "/preventivi",
    vuotoTitolo: "Ancora nessun preventivo",
    vuotoTesto: "Prepara la prima offerta: voci per fase, cassa e IVA calcolate, numero P-anno-progressivo assegnato in automatico.",
    inviati: "Inviati",
  },
  prefattibilita: {
    titolo: "Pre-fattibilità",
    sottotitolo: "Analisi urbanistiche e di conformità prima dell'incarico. Diventano un preventivo e, se accettato, una commessa.",
    nuovo: "Nuova",
    href: "/nuova/prefattibilita",
    base: "/prefattibilita",
    vuotoTitolo: "Ancora nessuna pre-fattibilità",
    vuotoTesto: "Registra la prima analisi: vincoli, stato legittimo, titolo edilizio, costo parametrico ed esito.",
    inviati: "Consegnate",
  },
};

export function ElencoPratiche({ tipo, pratiche }: { tipo: "preventivo" | "prefattibilita"; pratiche: Pratica[] }) {
  const t = TESTI[tipo];
  // Gli integrativi nascono già dentro una commessa: non contano nel tasso di conversione
  const base = pratiche.filter((p) => !p.integrativo);
  const convertite = base.filter((p) => p.commessa_id).length;
  const proseguite = tipo === "prefattibilita" ? base.filter((p) => p.commessa_id || p.preventivo_id).length : convertite;
  const chiuse = base.filter((p) => p.stato !== "bozza" && p.stato !== "in_corso").length;
  const tasso = chiuse ? Math.round((proseguite / chiuse) * 100) : null;

  const nuovo = (
    <PulsanteNuovo href={t.href} tipo={tipo}>{t.nuovo}</PulsanteNuovo>
  );

  return (
    <>
      <Cartiglio tipo={tipo}
        titolo={t.titolo}
        celle={[
          { etichetta: "Totale", valore: pratiche.length, icona: Layers },
          { etichetta: "In commessa", valore: convertite, icona: ArrowRightLeft },
          { etichetta: "Conversione", valore: tasso === null ? "—" : `${tasso}%`, icona: Percent },
        ]}
        nuovo={{ href: t.href, etichetta: t.titolo === "Preventivi" ? "Nuovo preventivo" : "Nuova pre-fattibilità", testo: t.nuovo }}
      />
      <Pannello>
        {pratiche.length === 0 ? (
          <Vuoto titolo={t.vuotoTitolo} testo={t.vuotoTesto} azione={nuovo} />
        ) : (
          <TabellaPratiche tipo={tipo} pratiche={pratiche} />
        )}
      </Pannello>
    </>
  );
}
