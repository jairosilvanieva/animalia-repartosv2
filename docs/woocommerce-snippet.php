<?php
/**
 * Animalia Repartos - envio de pedidos WooCommerce a la app interna.
 * Snippet independiente del aviso a Slack.
 *
 * Reemplazar:
 * - ANIMALIA_REPARTOS_API_URL por la URL publica del backend.
 * - ANIMALIA_REPARTOS_API_KEY por el valor de INTERNAL_API_KEY del backend.
 *
 * Nota:
 * - Mantener el envio a Slack en el snippet actual si todavia lo usan.
 * - Los pedidos web entran como NO PAGADOS por seguridad.
 * - En la app se marca "Pagado" manualmente cuando el local corrobora el pago.
 */

if (!defined('ANIMALIA_REPARTOS_API_URL')) {
    define('ANIMALIA_REPARTOS_API_URL', 'https://api-repartos.animalia.com.ar');
}

if (!defined('ANIMALIA_REPARTOS_API_KEY')) {
    define('ANIMALIA_REPARTOS_API_KEY', 'CAMBIAR_API_KEY');
}

function animalia_repartos_pedido_permitido($estado, $metodo_pago) {
    if (in_array($estado, array('processing', 'completed'), true)) {
        return true;
    }

    if ($estado !== 'pending') {
        return false;
    }

    return (
        stripos($metodo_pago, 'Promo BBVA (Pago Online - Martes y Jueves)') !== false ||
        stripos($metodo_pago, 'Dinero disponible en Mercado Pago o Transferencia bancaria') !== false ||
        stripos($metodo_pago, 'MODO + BBVA (Viernes y Sabado) - ES QR') !== false ||
        stripos($metodo_pago, 'MODO + BBVA (Pago Online con QR - 20% OFF + 3 Cuotas)') !== false
    );
}

function animalia_repartos_enviar_pedido($order_id) {
    if (!$order_id) return;

    $order = wc_get_order($order_id);
    if (!$order) return;

    if ($order->get_meta('_animalia_repartos_notificado')) return;

    $estado = $order->get_status();
    $metodo_pago = $order->get_payment_method_title() ?: '';

    if (!animalia_repartos_pedido_permitido($estado, $metodo_pago)) {
        return;
    }

    $productos = array();
    foreach ($order->get_items() as $item) {
        $productos[] = array(
            'nombre' => $item->get_name(),
            'cantidad' => (float) $item->get_quantity(),
            'precio_unitario' => $item->get_quantity() ? (float) $item->get_total() / (float) $item->get_quantity() : 0,
            'total' => (float) $item->get_total(),
        );
    }

    $dir_envio = trim($order->get_shipping_address_1());
    $dir_envio_2 = trim($order->get_shipping_address_2());
    $ciudad_envio = trim($order->get_shipping_city());
    $direccion_envio = $dir_envio;

    if ($dir_envio_2) {
        $direccion_envio .= $direccion_envio ? ' ' . $dir_envio_2 : $dir_envio_2;
    }

    if (!$direccion_envio) {
        $direccion_envio = trim($order->get_billing_address_1() . ' ' . $order->get_billing_address_2());
    }

    if (!$ciudad_envio) {
        $ciudad_envio = $order->get_billing_city();
    }

    $payload = array(
        'order_id' => $order->get_id(),
        'order_number' => $order->get_order_number(),
        'fecha' => $order->get_date_created() ? $order->get_date_created()->date('Y-m-d H:i:s') : current_time('mysql'),
        'fecha_reparto' => current_time('Y-m-d'),
        'nombre_cliente' => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
        'telefono' => $order->get_billing_phone(),
        'dni' => $order->get_meta('_billing_dni'),
        'productos' => $productos,
        'metodo_pago' => $metodo_pago,
        'subtotal' => (float) $order->get_subtotal(),
        'descuentos' => (float) $order->get_discount_total(),
        'total' => (float) $order->get_total(),
        'modalidad_envio' => method_exists($order, 'get_shipping_method') ? $order->get_shipping_method() : '',
        'direccion_envio' => $direccion_envio ?: 'Sin direccion cargada',
        'ciudad' => $ciudad_envio ?: 'Mar del Plata',
        'codigo_postal' => $order->get_shipping_postcode() ?: $order->get_billing_postcode(),
        'nota' => $order->get_customer_note(),
        'estado_woocommerce' => $estado,
        'pagado' => false,
        'origen' => 'woocommerce',
    );

    $response = wp_remote_post(ANIMALIA_REPARTOS_API_URL . '/api/orders/from-woocommerce', array(
        'method' => 'POST',
        'headers' => array(
            'Authorization' => 'Bearer ' . ANIMALIA_REPARTOS_API_KEY,
            'Content-Type' => 'application/json',
        ),
        'timeout' => 15,
        'body' => wp_json_encode($payload),
    ));

    if (!is_wp_error($response) && (int) wp_remote_retrieve_response_code($response) >= 200 && (int) wp_remote_retrieve_response_code($response) < 300) {
        $order->update_meta_data('_animalia_repartos_notificado', '1');
        $order->save();
    }
}

add_action('woocommerce_order_status_changed', 'animalia_repartos_notificar_por_estado', 20, 4);
function animalia_repartos_notificar_por_estado($order_id, $from_status, $to_status, $order) {
    if (!$order) return;
    if ($order->get_meta('_animalia_repartos_notificado')) return;

    if (animalia_repartos_pedido_permitido($to_status, $order->get_payment_method_title() ?: '')) {
        animalia_repartos_enviar_pedido($order_id);
    }
}

add_action('woocommerce_checkout_order_processed', 'animalia_repartos_notificar_checkout_pendiente', 20, 1);
function animalia_repartos_notificar_checkout_pendiente($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) return;
    if ($order->get_meta('_animalia_repartos_notificado')) return;

    if (animalia_repartos_pedido_permitido($order->get_status(), $order->get_payment_method_title() ?: '')) {
        animalia_repartos_enviar_pedido($order_id);
    }
}
