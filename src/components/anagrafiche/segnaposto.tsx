import { Scheletro } from "@/components/ui";

/** Segnaposto della scheda anagrafica (carta scura dell'identità + carta chiara) durante il caricamento. */
export function SegnapostoAnagrafica() {
  return (
    <div className="scheda-profilo grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
      <div className="carta-scura space-y-4 px-6 py-6">
        <Scheletro className="h-3 w-40 bg-white/15" />
        <Scheletro className="mt-8 size-9 bg-white/15" />
        <Scheletro className="h-7 w-3/4 bg-white/15" />
        <Scheletro className="h-4 w-1/2 bg-white/15" />
        <Scheletro className="mt-6 h-10 w-full bg-white/10" />
      </div>
      <div className="carta-chiara space-y-3 px-8 py-6">
        <Scheletro className="h-5 w-64" />
        <Scheletro className="mt-6 h-12 w-full" />
        <Scheletro className="h-12 w-full" />
        <Scheletro className="h-12 w-full" />
      </div>
    </div>
  );
}
