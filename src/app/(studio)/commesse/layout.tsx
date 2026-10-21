import { Guardia } from "@/components/permessi";

/** Commesse: visibili a chi ha almeno "Vede" sulle commesse. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Guardia chiave="commesse">{children}</Guardia>;
}
