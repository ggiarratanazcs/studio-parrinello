import { Suspense } from "react";
import { Modale } from "@/components/modale";
import { SchedaCommessa } from "@/components/schede/scheda-commessa";
import { SchedaSegnaposto } from "@/components/schede/comuni";

/** Scheda aperta in finestra modale sopra l'elenco. */
export default function ModaleSchedaCommessa({ params }: PageProps<"/commesse/[id]">) {
  return (
    <Suspense fallback={<Modale paginaIntera="/commesse" etichetta="Commessa"><SchedaSegnaposto /></Modale>}>
      <Contenuto params={params} />
    </Suspense>
  );
}

async function Contenuto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Modale paginaIntera={`/commesse/${id}`} etichetta="Commessa">
      <Suspense fallback={<SchedaSegnaposto />}>
        <SchedaCommessa id={id} />
      </Suspense>
    </Modale>
  );
}
