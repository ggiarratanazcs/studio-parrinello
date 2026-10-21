import { Guardia } from "@/components/permessi";

/** Pre-fattibilità: visibili a chi ha almeno "Vede" su pre-fattibilità e preventivi. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Guardia chiave="pratiche">{children}</Guardia>;
}
