import { type NextRequest } from "next/server";
import { leggiPreventivo } from "@/lib/dati";
import { pdfPreventivo } from "@/lib/pdf/preventivo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PDF del preventivo. Senza parametri si apre nel browser (per stampare);
 * con ?scarica=1 viene scaricato come file.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Preventivo non trovato", { status: 404 });

  const preventivo = await leggiPreventivo(id);
  if (!preventivo) return new Response("Preventivo non trovato", { status: 404 });

  const pdf = await pdfPreventivo(preventivo);
  const nome = `Preventivo ${preventivo.numero ?? id}.pdf`;
  const scarica = request.nextUrl.searchParams.has("scarica");

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${scarica ? "attachment" : "inline"}; filename="${nome}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
