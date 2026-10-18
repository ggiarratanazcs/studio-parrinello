"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Campo, Messaggio } from "@/components/campo";
import { Pulsante } from "@/components/ui";

type Modo = "accesso" | "recupero";

function traduciErrore(messaggio: string) {
  if (/invalid login credentials/i.test(messaggio)) return "Email o password non corrette.";
  if (/email not confirmed/i.test(messaggio)) return "Devi prima confermare l'invito ricevuto per email.";
  if (/rate limit/i.test(messaggio)) return "Troppi tentativi ravvicinati. Riprova tra qualche minuto.";
  return "Accesso non riuscito. Controlla i dati e riprova.";
}

export function ModuloAccesso() {
  const router = useRouter();
  const params = useSearchParams();
  const [modo, setModo] = useState<Modo>("accesso");
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(
    params.get("errore") === "link" ? "Il link è scaduto o è già stato usato. Chiedi un nuovo invito o recupera la password." : null,
  );
  const [inviato, setInviato] = useState(false);

  async function accedi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dati = new FormData(e.currentTarget);
    setInCorso(true);
    setErrore(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(dati.get("email")),
      password: String(dati.get("password")),
    });
    if (error) {
      setErrore(traduciErrore(error.message));
      setInCorso(false);
      return;
    }
    const destinazione = params.get("da");
    router.replace(destinazione?.startsWith("/") ? destinazione : "/");
    router.refresh();
  }

  async function recupera(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dati = new FormData(e.currentTarget);
    setInCorso(true);
    setErrore(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(String(dati.get("email")), {
      redirectTo: `${window.location.origin}/auth/conferma?next=/imposta-password`,
    });
    setInCorso(false);
    if (error) {
      setErrore(traduciErrore(error.message));
      return;
    }
    setInviato(true);
  }

  if (modo === "recupero") {
    return (
      <form onSubmit={recupera} className="mt-8 flex flex-col gap-5">
        <p className="text-[0.9375rem] text-inchiostro-2">
          Ti mandiamo un link per scegliere una nuova password.
        </p>
        <Campo etichetta="Email" id="email" name="email" type="email" autoComplete="email" required />
        {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
        {inviato ? (
          <Messaggio tipo="ok">Se l&apos;indirizzo è registrato, riceverai il link entro pochi minuti.</Messaggio>
        ) : null}
        <Pulsante type="submit" disabled={inCorso}>
          {inCorso ? <Loader2 className="size-4 animate-spin" /> : null}
          Invia il link
        </Pulsante>
        <button
          type="button"
          onClick={() => {
            setModo("accesso");
            setErrore(null);
            setInviato(false);
          }}
          className="self-start text-sm text-accento hover:underline"
        >
          Torna all&apos;accesso
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={accedi} className="mt-8 flex flex-col gap-5">
      <Campo etichetta="Email" id="email" name="email" type="email" autoComplete="email" required />
      <Campo
        etichetta="Password"
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {errore ? <Messaggio tipo="errore">{errore}</Messaggio> : null}
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? <Loader2 className="size-4 animate-spin" /> : null}
        Accedi
      </Pulsante>
      <button
        type="button"
        onClick={() => {
          setModo("recupero");
          setErrore(null);
        }}
        className="self-start text-sm text-accento hover:underline"
      >
        Password dimenticata?
      </button>
    </form>
  );
}
