import { notFound } from "next/navigation";
import { SchedaImmobile } from "@/components/anagrafiche/scheda-immobile";
import { UUID } from "@/components/schede/comuni";
import { leggiImmobile } from "@/lib/anagrafiche";

/** Legge l'immobile e mostra la scheda; con id "nuovo" apre la scheda vuota per crearne uno. */
export async function SchedaImmobileDaId({ id }: { id: string }) {
  if (id === "nuovo") return <SchedaImmobile scheda={null} />;
  if (!UUID.test(id)) notFound();
  const scheda = await leggiImmobile(id);
  if (!scheda) notFound();
  return <SchedaImmobile key={`${scheda.immobile.id}-${scheda.immobile.updated_at}`} scheda={scheda} />;
}
