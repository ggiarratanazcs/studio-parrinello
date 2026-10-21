import { Guardia } from "@/components/permessi";

/** Nuova pre-fattibilità: serve almeno "Modifica" su pre-fattibilità e preventivi. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Guardia chiave="pratiche" minimo={2}>{children}</Guardia>;
}
