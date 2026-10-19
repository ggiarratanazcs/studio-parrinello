import { Suspense } from "react";
import { Landmark, Layers, User } from "lucide-react";
import { PulsanteNuovo } from "@/components/tessere";
import { Cartiglio } from "@/components/cartiglio";
import { CaricamentoPannello } from "@/components/compasso";
import { Pannello, Vuoto } from "@/components/ui";
import { TabellaCommesse } from "@/components/tabella-commesse";
import { elencoCommesse } from "@/lib/dati";

export const metadata = { title: "Commesse" };

const nuovaCommessa = (
  <PulsanteNuovo href="/nuova/commessa" tipo="commessa">Nuova</PulsanteNuovo>
);

export default function PaginaCommesse() {
  return (
    <Suspense
      fallback={
        <>
          <Cartiglio tipo="commessa" titolo="Commesse" azioni={nuovaCommessa} />
          <CaricamentoPannello />
        </>
      }
    >
      <ElencoCommesse />
    </Suspense>
  );
}

async function ElencoCommesse() {
  const commesse = await elencoCommesse();
  const pubbliche = commesse.filter((c) => c.committenza === "pubblica").length;

  return (
    <>
      <Cartiglio tipo="commessa"
        titolo="Commesse"
        sottotitolo="Ogni incarico dello studio, dal primo contatto alla chiusura."
        celle={[
          { etichetta: "Totale", valore: commesse.length, icona: Layers },
          { etichetta: "Private", valore: commesse.length - pubbliche, icona: User },
          { etichetta: "Pubbliche", valore: pubbliche, icona: Landmark },
        ]}
        azioni={nuovaCommessa}
      />

      <Pannello>
        {commesse.length === 0 ? (
          <Vuoto
            azione={nuovaCommessa}
            titolo="Ancora nessuna commessa"
            testo={
              <>
                Una commessa nasce dal primo contatto con il committente. Il codice viene assegnato in
                automatico (per esempio <span className="numeri text-inchiostro">2026-001</span>).
              </>
            }
          />
        ) : (
          <TabellaCommesse commesse={commesse} />
        )}
      </Pannello>
    </>
  );
}
