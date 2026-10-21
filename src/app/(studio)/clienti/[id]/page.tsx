import { Suspense } from "react";
import { SchedaClienteDaId, SegnapostoAnagrafica } from "@/components/anagrafiche/scheda-cliente-dati";

export const metadata = { title: "Cliente" };

/** Scheda del cliente a pagina intera (aperta da un collegamento diretto o ricaricando la pagina). */
export default function PaginaCliente({ params }: PageProps<"/clienti/[id]">) {
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
  return <SchedaClienteDaId id={id} />;
}
