import { getProfilo } from "@/lib/auth";
import { Assistente } from "@/components/assistente/assistente";

/** Assistente dello studio: compare solo a titolare e architetti. */
export async function AssistenteStudio() {
  const profilo = await getProfilo();
  if (profilo.ruolo !== "titolare" && profilo.ruolo !== "architetto") return null;
  return <Assistente />;
}
