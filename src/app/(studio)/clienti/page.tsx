import { Building2, Landmark, User } from "lucide-react";
import { Suspense } from "react";
import { Cartiglio } from "@/components/cartiglio";
import { Pannello, Scheletro, Vuoto } from "@/components/ui";
import { elencoClienti } from "@/lib/dati";

export const metadata = { title: "Clienti" };

const TIPI: Record<string, string> = {
  persona_fisica: "Privato",
  azienda: "Azienda",
  ente_pubblico: "Ente pubblico",
};

export default function PaginaClienti() {
  return (
    <Suspense
      fallback={
        <>
          <Cartiglio titolo="Clienti" />
          <Pannello className="p-6">
            <Scheletro className="h-4 w-2/3" />
          </Pannello>
        </>
      }
    >
      <ElencoClienti />
    </Suspense>
  );
}

async function ElencoClienti() {
  const clienti = await elencoClienti();
  const conta = (t: string) => clienti.filter((c) => c.tipo === t).length;

  return (
    <>
      <Cartiglio
        titolo="Clienti"
        celle={[
          { etichetta: "Privati", valore: conta("persona_fisica"), icona: User },
          { etichetta: "Aziende", valore: conta("azienda"), icona: Building2 },
          { etichetta: "Enti", valore: conta("ente_pubblico"), icona: Landmark },
        ]}
      />
      <Pannello>
        {clienti.length === 0 ? (
          <Vuoto
            titolo="Nessun cliente in archivio"
            testo="Qui troverai l'anagrafica di ogni committente: dati fiscali, codice SDI o IPA per la fattura elettronica, PEC e referenti come il RUP o l'amministratore di condominio."
          />
        ) : (
          <ul className="elenco divide-y divide-linea">
            {clienti.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.denominazione}</span>
                  <span className="block truncate text-sm text-tenue">
                    {[c.comune, c.email ?? c.telefono].filter(Boolean).join(", ") || "Recapiti da completare"}
                  </span>
                </span>
                <span className="etichetta shrink-0">{TIPI[c.tipo] ?? c.tipo}</span>
              </li>
            ))}
          </ul>
        )}
      </Pannello>
    </>
  );
}
