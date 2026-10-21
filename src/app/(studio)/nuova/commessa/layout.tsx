import { Guardia } from "@/components/permessi";

/** Nuova commessa: serve almeno "Modifica" sulle commesse. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Guardia chiave="commesse" minimo={2}>{children}</Guardia>;
}
