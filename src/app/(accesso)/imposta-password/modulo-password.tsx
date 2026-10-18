"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Campo, Messaggio } from "@/components/campo";
import { Pulsante } from "@/components/ui";

export function ModuloPassword() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: p } = await supabase.from("profili").select("nome, cognome").eq("id", data.user.id).single();
      if (p) {
        setNome(p.nome);
        setCognome(p.cognome);
      }
    })();
  }, []);

  async function salva(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dati = new FormData(e.currentTarget);
    const password = String(dati.get("password"));
    if (password.length < 10) {
      setErrore("La password deve avere almeno 10 caratteri.");
      return;
    }
    if (password !== String(dati.get("conferma"))) {
      setErrore("Le due password non coincidono.");
      return;
    }

    setInCorso(true);
    setErrore(null);
    const supabase = createClient();
    const { data: utente } = await supabase.auth.getUser();
    if (!utente.user) {
      router.replace("/accesso?errore=link");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrore(
        /should be different/i.test(error.message)
          ? "La nuova password deve essere diversa da quella attuale."
          : "Non è stato possibile salvare la password. Riprova.",
      );
      setInCorso(false);
      return;
    }

    await supabase
      .from("profili")
      .update({ nome: nome.trim(), cognome: cognome.trim() })
      .eq("id", utente.user.id);

    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={salva} className="mt-8 flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Campo
          etichetta="Nome"
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="given-name"
          required
        />
        <Campo
          etichetta="Cognome"
          id="cognome"
          value={cognome}
          onChange={(e) => setCognome(e.target.value)}
          autoComplete="family-name"
          required
        />
      </div>
      <Campo
        etichetta="Nuova password"
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
      />
      <Campo
        etichetta="Ripeti la password"
        id="conferma"
        name="conferma"
        type="password"
        autoComplete="new-password"
        required
      />
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? <Loader2 className="size-4 animate-spin" /> : null}
        Salva e entra
      </Pulsante>
    </form>
  );
}
