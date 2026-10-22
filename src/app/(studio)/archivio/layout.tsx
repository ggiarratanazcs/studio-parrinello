import { Guardia } from "@/components/permessi";

/** Archivio: visibile a chi ha almeno "Vede" sull'area Archivio (chiave documenti). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Guardia chiave="documenti">{children}</Guardia>;
}
