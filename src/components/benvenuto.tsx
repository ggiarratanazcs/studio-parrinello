"use client";

import { useEffect, useState } from "react";
import { Compasso, DURATA_BENVENUTO } from "@/components/compasso";
import { CHIAVE_BENVENUTO } from "@/lib/impaginazione";

/**
 * Schermata d'ingresso: una volta per sessione il monogramma diventa compasso e traccia il cerchio,
 * poi la schermata sfuma sul portale. Un clic (o un tasto) la salta.
 * Se è già stata vista, lo script in <head> la nasconde prima che compaia (data-benvenuto="visto").
 */
export function Benvenuto() {
  const [fase, setFase] = useState<"visibile" | "sfuma" | "finita">("visibile");

  useEffect(() => {
    if (document.documentElement.dataset.benvenuto === "visto") {
      const t = setTimeout(() => setFase("finita"), 0);
      return () => clearTimeout(t);
    }
    try {
      sessionStorage.setItem(CHIAVE_BENVENUTO, "1");
    } catch {}
    const sfuma = setTimeout(() => setFase("sfuma"), (DURATA_BENVENUTO + 0.25) * 1000);
    const salta = () => setFase("sfuma");
    window.addEventListener("keydown", salta, { once: true });
    return () => {
      clearTimeout(sfuma);
      window.removeEventListener("keydown", salta);
    };
  }, []);

  useEffect(() => {
    if (fase !== "sfuma") return;
    const t = setTimeout(() => {
      setFase("finita");
      document.documentElement.dataset.benvenuto = "visto";
    }, 650);
    return () => clearTimeout(t);
  }, [fase]);

  if (fase === "finita") return null;
  return (
    <div
      className="benvenuto fixed inset-0 z-[100] grid cursor-pointer place-items-center bg-sfondo transition-opacity duration-[650ms] ease-out"
      style={{ opacity: fase === "sfuma" ? 0 : 1 }}
      onClick={() => setFase("sfuma")}
    >
      <Compasso unaVolta className="w-44 md:w-52" didascalia="Studio Parrinello" />
    </div>
  );
}
