import { Suspense } from "react";
import { SchedaImmobileDaId } from "@/components/anagrafiche/scheda-immobile-dati";
import { SegnapostoAnagrafica } from "@/components/anagrafiche/segnaposto";

export const metadata = { title: "Immobile" };

/** Scheda dell'immobile a pagina intera (aperta da un collegamento diretto o ricaricando la pagina). */
export default function PaginaImmobile({ params }: PageProps<"/immobili/[id]">) {
  return (
    <div className="mx-auto max-w-[60rem]">
      <Suspense fallback={<SegnapostoAnagrafica />}>
        <Contenuto params={params} />
      </Suspense>
    </div>
  );
}

async function Contenuto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SchedaImmobileDaId id={id} />;
}
