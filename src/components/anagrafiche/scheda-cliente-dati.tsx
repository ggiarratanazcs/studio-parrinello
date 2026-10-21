import { notFound } from "next/navigation";
import { SchedaCliente } from "@/components/anagrafiche/scheda-cliente";
import { UUID } from "@/components/schede/comuni";
import { leggiCliente } from "@/lib/anagrafiche";

/** Legge il cliente e mostra la scheda; con id "nuovo" apre la scheda vuota per crearne uno. */
export async function SchedaClienteDaId({ id }: { id: string }) {
  if (id === "nuovo") return <SchedaCliente scheda={null} />;
  if (!UUID.test(id)) notFound();
  const scheda = await leggiCliente(id);
  if (!scheda) notFound();
  return <SchedaCliente key={`${scheda.cliente.id}-${scheda.cliente.updated_at}`} scheda={scheda} />;
}

/** Segnaposto del foglio anagrafico durante il caricamento. */
export { SegnapostoAnagrafica } from "@/components/anagrafiche/segnaposto";
