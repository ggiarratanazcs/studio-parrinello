import "server-only";

/**
 * Trova le coordinate di un indirizzo italiano con il servizio gratuito di OpenStreetMap (Nominatim).
 * Regole d'uso del servizio: una richiesta al secondo, applicazione identificata.
 * Restituisce null se l'indirizzo non è stato trovato o il servizio non risponde.
 */
export async function geocodifica(a: {
  indirizzo: string;
  cap?: string | null;
  comune: string;
  provincia?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const tentativi: Record<string, string>[] = [
    // Ricerca strutturata: via + comune (+ CAP)
    { street: a.indirizzo, city: a.comune, ...(a.cap ? { postalcode: a.cap } : {}) },
    // Ricerca libera, utile per indirizzi scritti in modo non standard
    { q: [a.indirizzo, a.cap, a.comune, a.provincia, "Italia"].filter(Boolean).join(", ") },
  ];
  for (const parametri of tentativi) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.search = new URLSearchParams({ format: "json", limit: "1", countrycodes: "it", ...parametri }).toString();
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "StudioParrinello-Gestionale/1.0 (info@studioparrinello.com)", "Accept-Language": "it" },
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      if (!r.ok) continue;
      const dati = (await r.json()) as { lat: string; lon: string }[];
      if (dati[0]) return { lat: Number(Number(dati[0].lat).toFixed(6)), lng: Number(Number(dati[0].lon).toFixed(6)) };
    } catch {
      // servizio non raggiungibile: si riprova col tentativo successivo
    }
    await new Promise((r) => setTimeout(r, 1100));
  }
  return null;
}
