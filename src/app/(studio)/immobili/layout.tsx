import { Guardia } from "@/components/permessi";

/** Immobili: visibili a chi ha almeno "Vede" sugli immobili. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Guardia chiave="immobili">{children}</Guardia>;
}
