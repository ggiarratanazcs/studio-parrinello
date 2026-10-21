import { Guardia } from "@/components/permessi";

/** Documenti: visibili a chi ha almeno "Vede" sui documenti. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Guardia chiave="documenti">{children}</Guardia>;
}
