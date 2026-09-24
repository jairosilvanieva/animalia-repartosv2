import { env } from '../config/env.js';

// ============================================================================
// Integracion WhatsApp via Aoki (Reminder API Service)
// Doc: POST https://calendar-service.aokitech.com.ar/api/reminders
// Se dispara cuando una ruta pasa a "activa" (cargar a camioneta): avisa a
// cada cliente que su pedido esta en camino, con su posicion en el recorrido.
//
// SEGURO POR DEFECTO: si no estan seteadas AOKI_API_KEY y AOKI_TEMPLATE_NAME
// en el .env, no envia nada (solo loguea que quedo salteado). Asi se puede
// desplegar el codigo antes de tener la plantilla aprobada por Meta.
// ============================================================================

// Normaliza un telefono a formato WhatsApp Argentina: 549 + area + numero.
// Los celulares AR en WhatsApp necesitan el "9" despues del 54.
// OJO: los telefonos vienen de WooCommerce/carga manual en formatos variados;
// esta normalizacion cubre los casos comunes y conviene verificarla con
// numeros reales en la primera prueba.
export function toWhatsappPhone(raw) {
  let d = String(raw || '').replace(/\D/g, ''); // solo digitos
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);        // prefijo internacional 00
  if (d.startsWith('54')) {
    d = d.slice(2);                              // saco pais
    if (d.startsWith('9')) d = d.slice(1);       // saco 9 (lo re-agrego abajo)
  }
  if (d.startsWith('0')) d = d.slice(1);         // saco 0 inicial (formato local)
  // Nota: no intentamos quitar el "15" porque no es detectable de forma segura;
  // si aparecen numeros con 15, se ajusta aca tras la primera prueba.
  return '549' + d;                              // pais(54) + movil(9) + area+numero
}

// Envia la notificacion "pedido en camino" a cada parada de la ruta.
// No lanza excepciones: cualquier fallo se loguea y NO frena la carga de la ruta.
export async function notifyRouteOnTheWay(route) {
  if (!env.aoki.apiKey || !env.aoki.templateName) {
    console.log('[Aoki] notificacion salteada: falta AOKI_API_KEY o AOKI_TEMPLATE_NAME en .env');
    return { skipped: true, reason: 'aoki_no_config' };
  }

  const stops = (route?.stops || []).filter(
    (s) => s.phone && s.status !== 'no_entregado'
  );
  if (!stops.length) return { skipped: true, reason: 'sin_paradas_con_telefono' };

  // "Enviar ya": la API exige fecha futura, usamos ahora + 1 minuto.
  const scheduledAt = new Date(Date.now() + 60 * 1000).toISOString();

  const results = [];
  for (const stop of stops) {
    const receiver = toWhatsappPhone(stop.phone);
    if (!receiver) continue;

    // Variables de la plantilla (POSICIONALES): {{1}} = nombre, {{2}} = Nª entrega.
    // Si la plantilla aprobada usa otras variables/orden, ajustar este array.
    const payload = {
      content: {
        template: {
          name: env.aoki.templateName,
          language: { code: env.aoki.templateLang },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: String(stop.customer_name || 'cliente') },
                { type: 'text', text: String(stop.stop_order || '') }
              ]
            }
          ]
        }
      },
      content_type: 'template',
      channel_alias: env.aoki.channelAlias,
      receiver,
      scheduled_at: scheduledAt,
      metadata: {
        order_id: stop.order_id,
        route_id: route.id,
        stop_order: stop.stop_order
      }
    };

    try {
      const res = await fetch(`${env.aoki.baseUrl}/api/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.aoki.apiKey
        },
        body: JSON.stringify(payload)
      });
      const body = await res.json().catch(() => ({}));
      const ok = res.ok;
      results.push({ order_id: stop.order_id, ok, status: res.status, id: body?.data?.id });
      if (!ok) {
        console.error(`[Aoki] fallo pedido ${stop.order_id} HTTP ${res.status}: ${JSON.stringify(body)}`);
      }
    } catch (error) {
      console.error(`[Aoki] excepcion pedido ${stop.order_id}: ${error.message}`);
      results.push({ order_id: stop.order_id, ok: false, error: error.message });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  console.log(`[Aoki] ruta ${route.id}: ${sent}/${results.length} notificaciones programadas`);
  return { skipped: false, sent, total: results.length, results };
}
