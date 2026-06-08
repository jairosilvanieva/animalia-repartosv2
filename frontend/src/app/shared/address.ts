// Limpia una direccion para abrir en Maps/Waze sacando aclaraciones
// que confunden al motor de busqueda. Ej:
//   "Brown 1550, deja al portero" -> "Brown 1550"
//   "Mario Bravo 3200 piso 2"      -> "Mario Bravo 3200"
//   "20 de septiembre 1550"        -> "20 de septiembre 1550" (no toca)
//
// Estrategia:
//   1) Corta en separadores duros: coma, punto y coma, parentesis.
//   2) Corta cuando aparece una "palabra-senal" que indica aclaracion
//      (piso, depto, portero, dejar, tocar, etc).
// No cuenta digitos -> respeta nombres de calles con numeros como
// "9 de Julio", "20 de Junio", "11 de Septiembre", etc.

const STOP_WORDS = [
  'piso', 'pisos', 'depto', 'dpto', 'depart',
  'casa', 'ph', 'timbre', 'portero', 'portera',
  'deja', 'dejar', 'tocar', 'llamar', 'avisar', 'mencionar',
  'edificio', 'frente', 'fondo', 'block', 'galpon',
  'subsuelo', 'planta', 'altos', 'arriba', 'cuello',
  'baulera', 'cochera', 'cocheras', 'unidad', 'oficina'
];

const STOP_REGEX = new RegExp(`\\s+(${STOP_WORDS.join('|')})\\b.*$`, 'i');

/**
 * Devuelve la version "limpia" de la direccion, lista para usar en
 * URLs de Maps/Waze.
 */
export function cleanAddressForMaps(address: string | null | undefined): string {
  if (!address) return '';
  let cleaned = String(address)
    // Corte en separadores duros: coma, punto y coma, dos puntos, parentesis,
    // guiones (algunos clientes escriben "Brown 1550 - tocar timbre")
    .split(/[,;:()\-—–]/)[0]
    .trim();

  // Corte por palabras-senal
  cleaned = cleaned.replace(STOP_REGEX, '');

  return cleaned.trim();
}

/**
 * Concatena la direccion limpia con la ciudad/provincia para que
 * Maps/Waze siempre tengan contexto suficiente.
 */
export function addressForMapsQuery(address: string | null | undefined, city = 'Mar del Plata'): string {
  const clean = cleanAddressForMaps(address);
  if (!clean) return '';
  return city ? `${clean}, ${city}, Argentina` : `${clean}, Argentina`;
}
