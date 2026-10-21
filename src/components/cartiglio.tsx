import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { LogoImmagine } from "@/components/studio-contesto";
import { leggiStudio } from "@/lib/studio";
import { Tessere, type Cella } from "@/components/tessere";
import { FONDI, type TipoFondo } from "@/lib/fondi";

export type { Cella };

/**
 * Intestazione di pagina: testata scura con la pianta del Teatro Greco di Siracusa disegnata
 * a linee chiare (colore per sezione, come le modali), titolo e sottotitolo in chiaro;
 * sotto, le azioni a sinistra e i riquadri informativi a destra, sollevati sul bordo della testata.
 */
export async function Cartiglio({
  titolo,
  sottotitolo,
  celle = [],
  azioni,
  crea,
  tipo = "studio",
  sopratitolo,
  icona: IconaTitolo,
  disegno,
}: {
  titolo: string;
  sottotitolo?: string;
  celle?: Cella[];
  azioni?: ReactNode;
  /** Pulsante "Crea" appoggiato sul bordo inferiore della testata (home) */
  crea?: ReactNode;
  tipo?: TipoFondo;
  sopratitolo?: string;
  /** Al posto del titolo scritto (es. la casa per la home): il titolo resta per gli screen reader. */
  icona?: ComponentType<LucideProps>;
  /** Disegno di sfondo diverso da quello della sezione (es. la home) */
  disegno?: string;
  /** Non più necessario: ora tutti i titoli sono piccoli e delicati (resta per compatibilità) */
  discreto?: boolean;
}) {
  const studio = await leggiStudio();
  const f = FONDI[tipo];
  return (
    <header className="mb-8 md:mb-10">
      <div
        className="testata-pagina relative overflow-hidden rounded-[26px] text-[#f3ece0] shadow-[0_24px_50px_-28px_rgba(43,42,40,0.7)]"
        style={{ background: f.base }}
      >
        {/* Disegno della sezione */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-[position:62%_center] opacity-50 md:bg-[position:right_center]"
          style={{ backgroundImage: `url(${disegno ?? f.disegno})` }}
        />
        {/* Velatura: piena a sinistra per il testo, si apre sul disegno a destra */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, rgba(${f.rgb},0.97) 0%, rgba(${f.rgb},0.82) 34%, rgba(${f.rgb},0.5) 68%, rgba(${f.rgb},0.42) 100%)`,
          }}
        />
        {/* Su telefono il disegno passa sotto il testo: velatura più piena */}
        <div aria-hidden className="absolute inset-0 md:hidden" style={{ background: `rgba(${f.rgb},0.55)` }} />
        <div className="testata-contenuto relative flex min-h-44 flex-col justify-start px-6 pb-7 pt-10 md:min-h-56 md:px-10 md:pb-10 md:pt-14">
          <p className="flex items-center gap-2.5 text-[0.75rem] uppercase tracking-[0.22em] text-[#f3ece0]/60">
            <LogoImmagine logoUrl={studio.logoUrl} nome={studio.nome} titolo="" className="h-4 text-[#f3ece0]/70" chiaro />
            {sopratitolo ?? studio.nome}
          </p>
          {IconaTitolo ? (
            <h1 className="mt-3">
              <IconaTitolo aria-hidden className="size-12 text-[#f6efe3] md:size-14" strokeWidth={1} />
              <span className="sr-only">{titolo}</span>
            </h1>
          ) : (
            // Tutte le pagine: titolo piccolo e delicato sotto "Studio Parrinello", come in home
            <h1 className="titolo-discreto mt-2.5">{titolo}</h1>
          )}
          {sottotitolo ? <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-[#f3ece0]/70">{sottotitolo}</p> : null}
        </div>
      </div>

      {crea ? <div className="relative z-30 lg:-mt-7 lg:px-10">{crea}</div> : null}

      {celle.length > 0 || azioni ? (
        <div className="mt-4 flex flex-col gap-4 md:flex-row-reverse md:items-start md:justify-between md:px-6">
          {celle.length > 0 ? <Tessere celle={celle} className="relative z-10 md:-mt-12 md:justify-end" /> : null}
          {azioni ? <div className="flex flex-wrap gap-2 md:pt-1">{azioni}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
