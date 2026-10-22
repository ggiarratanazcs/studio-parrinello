import { Suspense } from "react";
import { ModuloAccesso } from "./modulo-accesso";
import { leggiStudio } from "@/lib/studio";

export const metadata = { title: "Accesso" };

export default async function PaginaAccesso() {
  const studio = await leggiStudio();
  return (
    <>
      {/* Benvenuto: nome dello studio dalla configurazione */}
      <p className="etichetta">Benvenuto in {studio.nome}</p>
      <h1 className="titolo-display mt-2 text-[2.25rem]">Accedi</h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-tenue">
        Commesse, pratiche e cantieri dello studio, sempre a portata di mano. Usa l&apos;email con cui sei stato invitato.
      </p>
      <Suspense>
        <ModuloAccesso />
      </Suspense>
    </>
  );
}
