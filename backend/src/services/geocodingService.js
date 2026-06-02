// Geocoding via Nominatim (OpenStreetMap).
// Pros: gratis, sin API key, cobertura buena para direcciones argentinas.
// Contras: rate limit estricto (1 req/seg). Para volumen alto convendría hostear propio.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'AnimaliaRepartos/0.1 (animalia@local)';

// Bounding box aproximado de Mar del Plata para acotar resultados.
const MDP_VIEWBOX = '-57.70,-37.90,-57.48,-38.12'; // left,top,right,bottom

// Cola simple para respetar 1 req/seg.
let lastCall = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

export async function geocodeAddress(address) {
  if (!address) return null;

  await throttle();

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', normalizeAddress(address));
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('countrycodes', 'ar');
  url.searchParams.set('viewbox', MDP_VIEWBOX);
  url.searchParams.set('bounded', '1');
  url.searchParams.set('addressdetails', '1');

  let response;
  try {
    response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  } catch (error) {
    console.warn(`Geocoding fallo para "${address}": ${error.message}`);
    return null;
  }
  if (!response.ok) {
    console.warn(`Geocoding HTTP ${response.status} para "${address}".`);
    return null;
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    console.warn(`Geocoding sin resultados para "${address}".`);
    return null;
  }

  // Preferimos resultados con número de casa (más precisos).
  const withHouse = data.filter((r) => r.address?.house_number);
  const best = withHouse[0] || data[0];

  const lat = Number(best.lat);
  const lng = Number(best.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    latitude: lat,
    longitude: lng,
    label: best.display_name || null,
    confidence: best.importance || null
  };
}

function normalizeAddress(address) {
  let value = String(address || '').trim();
  // Saco "Av." literal — Nominatim a veces no lo reconoce; el matcher ya entiende "Avenida".
  value = value.replace(/^av\.?\s+/i, 'Avenida ');
  if (!/mar del plata/i.test(value)) value += ', Mar del Plata';
  if (!/argentina/i.test(value)) value += ', Argentina';
  return value;
}
