/** Sezioni dell'applicazione e dove compaiono nella navigazione. */
import {
  Building2,
  DraftingCompass,
  Ellipsis,
  Files,
  LandPlot,
  House,
  ReceiptText,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";

export type Voce = {
  href: string;
  etichetta: string;
  breve?: string;
  icona: LucideIcon;
  /** Barra in basso su telefono */
  mobile: boolean;
  /** Schede in alto (impaginazione Materia) */
  superiore: boolean;
  /** Barra laterale */
  laterale: boolean;
  /** Mostrata solo con l'icona (il nome resta nel suggerimento e per gli screen reader) */
  soloIcona?: boolean;
};

export const VOCI: Voce[] = [
  { href: "/", etichetta: "Home", icona: House, soloIcona: true, mobile: true, superiore: true, laterale: true },
  { href: "/prefattibilita", etichetta: "Pre-fattibilità", breve: "Fattibilità", icona: LandPlot, mobile: true, superiore: true, laterale: true },
  { href: "/preventivi", etichetta: "Preventivi", icona: ReceiptText, mobile: true, superiore: true, laterale: true },
  { href: "/commesse", etichetta: "Commesse", icona: DraftingCompass, mobile: true, superiore: true, laterale: true },
  { href: "/clienti", etichetta: "Clienti", icona: Users, mobile: false, superiore: true, laterale: true },
  { href: "/immobili", etichetta: "Immobili", icona: Building2, mobile: false, superiore: true, laterale: true },
  { href: "/documenti", etichetta: "Documenti", icona: Files, mobile: false, superiore: true, laterale: true },
  { href: "/impostazioni", etichetta: "Impostazioni", icona: Settings2, mobile: false, superiore: false, laterale: true },
  { href: "/altro", etichetta: "Altro", icona: Ellipsis, mobile: true, superiore: false, laterale: false },
];

/** Sezioni raggiungibili da "Altro" su telefono. */
export const VOCI_ALTRO = VOCI.filter((v) => !v.mobile && v.laterale);

