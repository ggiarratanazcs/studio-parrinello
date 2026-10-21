import { Scheletro } from "@/components/ui";

/** Segnaposto della scheda anagrafica (profilo con colonna) durante il caricamento. */
export function SegnapostoAnagrafica() {
  return (
    <div className="scheda-profilo grid overflow-hidden rounded-piccolo border border-linea-forte bg-superficie lg:grid-cols-[21.5rem_minmax(0,1fr)]">
      <div className="space-y-4 border-b border-linea bg-superficie-2/45 px-6 py-7 lg:border-b-0 lg:border-r">
        <Scheletro className="size-14 rounded-[12px]" />
        <Scheletro className="h-7 w-3/4" />
        <Scheletro className="h-4 w-1/2" />
        <Scheletro className="mt-6 h-4 w-full" />
        <Scheletro className="h-4 w-5/6" />
      </div>
      <div className="space-y-3 px-8 py-7">
        <Scheletro className="h-9 w-48 rounded-full" />
        <Scheletro className="mt-6 h-12 w-full" />
        <Scheletro className="h-12 w-full" />
        <Scheletro className="h-12 w-full" />
      </div>
    </div>
  );
}
