// Helper unico para mensajes de WhatsApp. Editar aca se refleja en
// admin, route-review y vista chofer.

const ANIMALIA_WA_LINK = 'https://wa.me/2235503897';

interface MessageOpts {
  /** Posicion de esta parada en la ruta (1-based). Si esta indefinido,
   * no se incluye la linea de "entregas previas". */
  stopOrder?: number | null;
}

export function buildAnimaliaMessage(opts: MessageOpts = {}): string {
  const lines: string[] = [];
  lines.push('Hola, ¿cómo estás? 🐾');
  lines.push('🚚 Tu pedido ya salió del local y está en ruta.');

  if (opts.stopOrder != null && opts.stopOrder > 0) {
    const previous = opts.stopOrder - 1;
    if (previous === 0) {
      lines.push('📍 Sos la primera entrega del recorrido.');
    } else if (previous === 1) {
      lines.push('📍 Tiene 1 entrega previa antes de llegar a tu domicilio.');
    } else {
      lines.push(`📍 Tiene ${previous} entregas previas antes de llegar a tu domicilio.`);
    }
  }

  lines.push('Por cualquier duda o consulta, por favor escribinos a este WhatsApp:');
  lines.push(ANIMALIA_WA_LINK);
  lines.push('📲 Te pedimos que no respondas este mensaje, así podemos ayudarte más rápido desde el canal correspondiente.');
  lines.push('¡Gracias por elegir Animalia! 💙');

  return lines.join('\n');
}

export function buildWhatsappUrl(phone: string | undefined | null, message: string): string {
  return `https://wa.me/${cleanPhone(phone || '')}?text=${encodeURIComponent(message)}`;
}

function cleanPhone(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('54')) return digits;
  if (digits.startsWith('0')) return `54${digits.slice(1)}`;
  return `54${digits}`;
}
