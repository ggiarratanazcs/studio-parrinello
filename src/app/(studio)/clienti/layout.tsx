import { Guardia } from "@/components/permessi";

/** Clienti: visibili a chi ha almeno "Vede" sui clienti. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Guardia chiave="clienti">{children}</Guardia>;
}
