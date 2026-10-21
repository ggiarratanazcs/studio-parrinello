"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Monogramma } from "@/components/monogramma";
import { cn } from "@/lib/utils";

/**
 * Nome, claim e logo dello studio per i componenti del browser (barre, finestre, benvenuto).
 * I valori arrivano dal layout, che li legge dalla configurazione (Impostazioni → Studio).
 */
export type IdentitaStudio = { nome: string; claim: string; logoUrl: string | null };

const Contesto = createContext<IdentitaStudio>({ nome: "Studio Parrinello", claim: "Architettura e design", logoUrl: null });

export function StudioProvider({ valore, children }: { valore: IdentitaStudio; children: ReactNode }) {
  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useStudio() {
  return useContext(Contesto);
}

/**
 * Logo dello studio: l'immagine caricata dal titolare oppure, se manca, il monogramma.
 * `chiaro`: su fondo scuro il logo caricato diventa una sagoma chiara, come il monogramma.
 */
export function LogoStudio({ className, chiaro, titolo }: { className?: string; chiaro?: boolean; titolo?: string }) {
  const { logoUrl, nome } = useStudio();
  return <LogoImmagine logoUrl={logoUrl} nome={nome} className={className} chiaro={chiaro} titolo={titolo} />;
}

/** Stessa resa di LogoStudio, con i dati passati direttamente (per i componenti del server). */
export function LogoImmagine({
  logoUrl,
  nome,
  className,
  chiaro,
  titolo,
}: {
  logoUrl: string | null;
  nome: string;
  className?: string;
  chiaro?: boolean;
  titolo?: string;
}) {
  if (!logoUrl) return <Monogramma className={className} titolo={titolo ?? nome} />;
  return (
    // Immagine caricata dal titolare (SVG o raster, dimensione libera): niente ottimizzazione di Next
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={titolo ?? nome} className={cn("logo-studio w-auto max-w-[9rem] object-contain", chiaro && "logo-chiaro", className)} />
  );
}
