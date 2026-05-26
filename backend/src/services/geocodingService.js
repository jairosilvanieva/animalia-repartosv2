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

  const response = await fetch(url).catch(() => null);
  if (!response?.ok) return null;

  const data = await response.json();
  const feature = data.features?.[0];
  const coordinates = feature?.geometry?.coordinates;
  if (!coordinates?.length) return null;

  const label = feature.properties?.label || '';
  if (!looksLikeSameStreet(address, label)) return null;

  return {
    longitude: coordinates[0],
    latitude: coordinates[1],
    label,
    confidence: feature.properties?.confidence || null
  };
}

function normalizeAddress(address) {
  const value = String(address || '').trim();
  if (/mar del plata/i.test(value)) return value;
  return `${value}, Mar del Plata, Buenos Aires, Argentina`;
}

function looksLikeSameStreet(input, label) {
  const inputStreet = normalizeStreetName(input);
  const labelStreet = normalizeStreetName(label);
  if (!inputStreet || !labelStreet) return false;
  return labelStreet.includes(inputStreet) || inputStreet.includes(labelStreet);
}

function normalizeStreetName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(av|av\.|avenida|calle|mar|del|plata|buenos|aires|argentina)\b/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/[^a-zñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word.length > 2)
    .slice(0, 2)
    .join(' ');
}
