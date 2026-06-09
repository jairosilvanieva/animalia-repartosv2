// Helper unico para mensajes de WhatsApp. Editar aca se refleja en
// admin, route-review y vista chofer.

// Link de WhatsApp de soporte. El numero esta registrado como WhatsApp
// Business asi que la preview que genera el cartel muestra el logo
// oficial de Animalia (no el generico "WhatsApp Messenger").
const ANIMALIA_WA_URL = 'https://wa.me/5492235503897';

// Emojis declarados como code points Unicode explicitos para evitar
// problemas de encoding en el build/transmision.
const E = {
  paw: '\u{1F43E}',                    // 🐾
  truck: '\u{1F69A}',                  // 🚚
  pin: '\u{1F4CD}',                    // 📍
  pointRight: '\u{1F449}',             // 👉
  iphone: '\u{1F4F1}',                 // 📱
  heart: '\u{2764}\u{FE0F}'            // ❤️
};

interface MessageOpts {
  /** Posicion de esta parada en la ruta (1-based). Si esta indefinido,
   * no se incluye la linea de "Sos la Nª entrega". */
  stopOrder?: number | null;
}

/**
 * Mensaje completo para avisar al cliente cuando se carga la ruta a
 * camioneta (usado en admin y route-review).
 *
 * El numero de entrega (1ª, 2ª, 3ª, ...) se calcula con stop_order
 * (la posicion 1-based de la parada en la ruta).
 */
export function buildAnimaliaMessage(opts: MessageOpts = {}): string {
  const lines: string[] = [];
  lines.push(`Hola, ¿cómo estás? ${E.paw}`);
  lines.push('');
  lines.push(`${E.truck} Tu pedido ya salió del local y está en camino`);

  if (opts.stopOrder != null && opts.stopOrder > 0) {
    lines.push(`${E.pin} Sos la ${opts.stopOrder}ª entrega del recorrido.`);
  }

  lines.push('');
  lines.push(`${E.pointRight} ${E.iphone} *Este canal se utiliza únicamente para notificaciones automáticas*.`);
  lines.push('Si necesitás comunicarte con nosotros, podés escribirnos al siguiente WhatsApp:');
  lines.push('');
  lines.push(ANIMALIA_WA_URL);
  lines.push('');
  lines.push(`¡Gracias por elegir Animalia! ${E.heart}`);

  return lines.join('\n');
}

/** URL de WhatsApp con mensaje prellenado (admin / route-review).
 *
 * Usamos api.whatsapp.com/send en lugar de wa.me porque wa.me tiene
 * un bug conocido decodificando emojis (4 bytes UTF-8) cuando vienen
 * en la URL — el receptor termina viendo el caracter de reemplazo �.
 * api.whatsapp.com los procesa correctamente.
 */
export function buildWhatsappUrl(phone: string | undefined | null, message: string): string {
  const cleanedPhone = cleanPhone(phone || '');
  return `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(message)}`;
}

/**
 * URL de WhatsApp SIN texto prefijado: abre el chat directo con el
 * cliente para que el chofer escriba lo que quiera en el momento
 * (ej. "Estoy afuera").
 */
export function buildWhatsappOpenChat(phone: string | undefined | null): string {
  return `https://wa.me/${cleanPhone(phone || '')}`;
}

function cleanPhone(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('54')) return digits;
  if (digits.startsWith('0')) return `54${digits.slice(1)}`;
  return `54${digits}`;
}
