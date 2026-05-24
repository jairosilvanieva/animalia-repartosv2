import { env } from '../config/env.js';

const BASE_URL = 'https://api.openrouteservice.org/geocode/search';

export async function geocodeAddress(address) {
  if (!env.orsApiKey || !address) return null;

  const url = new URL(BASE_URL);
  url.searchParams.set('api_key', env.orsApiKey);
  url.searchParams.set('text', normalizeAddress(address));
  url.searchParams.set('boundary.country', 'AR');
  url.searchParams.set('focus.point.lat', '-38.0055');
  url.searchParams.set('focus.point.lon', '-57.5426');
  url.searchParams.set('size', '1');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo geocodificar la direccion: ${response.status}`);
  }

  const data = await response.json();
  const feature = data.features?.[0];
  const coordinates = feature?.geometry?.coordinates;
  if (!coordinates?.length) return null;

  return {
    longitude: coordinates[0],
    latitude: coordinates[1],
    label: feature.properties?.label || null,
    confidence: feature.properties?.confidence || null
  };
}

function normalizeAddress(address) {
  const value = String(address || '').trim();
  if (/mar del plata/i.test(value)) return value;
  return `${value}, Mar del Plata, Buenos Aires, Argentina`;
}
