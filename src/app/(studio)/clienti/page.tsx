import { Building2, Landmark, User } from "lucide-react";
import { Suspense } from "react";
import { Cartiglio } from "@/components/cartiglio";
import { CaricamentoPannello } from "@/components/compasso";
import { Pannello, Vuoto } from "@/components/ui";
import { elencoClienti } from "@/lib/dati";
import { TabellaClienti } from "@/components/tabella-clienti";

export const metadata = { title: "Clienti" };

export default function PaginaClienti() {
  return (
    <Suspense
      fallback={
        <>
          <Cartiglio titolo="Clienti" />
          <CaricamentoPannello />
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
          <TabellaClienti clienti={clienti} />
        )}
      </Pannello>
    </>
  );
}
