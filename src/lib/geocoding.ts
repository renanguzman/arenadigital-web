// Geocodificação best-effort via Nominatim (OpenStreetMap).
// IMPORTANTE: deve ser chamado apenas no servidor. O Nominatim exige um
// User-Agent identificável e bloqueia/limita requisições feitas direto do
// navegador (CORS + política de uso), por isso a chamada vive aqui no backend.

export type GeocodeAddress = {
  street: string
  number?: string
  neighborhood?: string
  city: string
  state: string
}

/**
 * Retorna um WKT `POINT(lon lat)` para o endereço informado, ou `null` quando
 * não for possível resolver. Nunca lança — geocodificação é best-effort e não
 * deve interromper o salvamento.
 */
export async function getLocationPointFromAddress(
  address: GeocodeAddress
): Promise<string | null> {
  const query = `${address.street}, ${address.number ?? ''}, ${address.city}, ${address.state}, Brasil`
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: {
          'Accept-Language': 'pt-BR',
          'User-Agent': 'ArenaDigital-Web-Sync',
        },
      }
    )
    if (!res.ok) return null
    const geoData = await res.json()
    if (geoData?.[0]) return `POINT(${geoData[0].lon} ${geoData[0].lat})`
  } catch {
    /* geocoding is best-effort */
  }
  return null
}
