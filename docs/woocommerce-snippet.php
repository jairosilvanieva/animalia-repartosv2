<?php
/**
 * Ejemplo para sumar al snippet actual que ya envia pedidos a Slack.
 * Ajustar ANIMALIA_REPARTOS_API_URL y ANIMALIA_REPARTOS_API_KEY.
 */

add_action('woocommerce_checkout_order_processed', 'animalia_enviar_pedido_a_repartos', 20, 1);

function animalia_enviar_pedido_a_repartos($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) {
        return;
    }

    $productos = array();
    foreach ($order->get_items() as $item) {
        $productos[] = array(
            'nombre' => $item->get_name(),
            'cantidad' => $item->get_quantity(),
            'total' => (float) $item->get_total(),
        );
    }

    $payload = array(
        'order_id' => $order->get_id(),
        'order_number' => $order->get_order_number(),
        'fecha' => $order->get_date_created() ? $order->get_date_created()->date('Y-m-d H:i:s') : current_time('mysql'),
        'nombre_cliente' => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
        'telefono' => $order->get_billing_phone(),
        'dni' => $order->get_meta('_billing_dni'),
        'productos' => $productos,
        'metodo_pago' => $order->get_payment_method_title(),
        'subtotal' => (float) $order->get_subtotal(),
        'descuentos' => (float) $order->get_discount_total(),
        'total' => (float) $order->get_total(),
        'modalidad_envio' => $order->get_shipping_method(),
        'direccion_envio' => trim($order->get_shipping_address_1() . ' ' . $order->get_shipping_address_2()),
        'ciudad' => $order->get_shipping_city(),
        'codigo_postal' => $order->get_shipping_postcode(),
        'nota' => $order->get_customer_note(),
        'estado_woocommerce' => $order->get_status(),
        'requiere_corroborrar_pago' => !in_array($order->get_payment_method(), array('cod'), true) && !$order->is_paid(),
        'origen' => 'woocommerce',
    );

    wp_remote_post(ANIMALIA_REPARTOS_API_URL . '/api/orders/from-woocommerce', array(
        'headers' => array(
            'Authorization' => 'Bearer ' . ANIMALIA_REPARTOS_API_KEY,
            'Content-Type' => 'application/json',
        ),
        'timeout' => 10,
        'body' => wp_json_encode($payload),
    ));
}
