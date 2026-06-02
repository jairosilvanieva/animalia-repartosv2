<?php
/**
 * Animalia Repartos — Envío de pedidos desde WooCommerce a la app interna.
 *
 * Qué hace:
 *  - Escucha cuando un pedido pasa a `processing` o `completed`, o cuando entra como `pending`
 *    con uno de los métodos de pago manuales (corroborar pago).
 *  - Filtra retiros en local y envíos fuera de MDP antes de mandar (el backend igual revalida).
 *  - Mapea el pedido al formato que espera POST /api/orders/from-woocommerce.
 *  - Usa una meta `_animalia_repartos_notificado` para evitar duplicados.
 *
 * Configuración:
 *  - Cambiá ANIMALIA_REPARTOS_URL al dominio de la app cuando esté en producción.
 *  - El ANIMALIA_REPARTOS_KEY debe coincidir con el INTERNAL_API_KEY del .env del backend.
 *
 * Convive con el snippet de Slack: ambos pueden estar activos al mismo tiempo.
 */

if ( ! defined('ABSPATH') ) exit;

define('ANIMALIA_REPARTOS_URL', 'https://TU-DOMINIO.com/api/orders/from-woocommerce');
define('ANIMALIA_REPARTOS_KEY', 'cambiar-api-key-woocommerce'); // = INTERNAL_API_KEY del .env del backend

/**
 * Trigger principal: cuando cambia el status del pedido a processing/completed.
 */
add_action('woocommerce_order_status_changed', 'animalia_repartos_on_status_change', 25, 4);
function animalia_repartos_on_status_change( $order_id, $from, $to, $order ) {
    if ( ! $order ) return;
    if ( $order->get_meta('_animalia_repartos_notificado') ) return;

    if ( in_array($to, ['processing', 'completed'], true) ) {
        animalia_repartos_enviar( $order_id );
    }
}

/**
 * Trigger secundario: cuando se crea un pedido pending con métodos manuales (corroborar pago).
 */
add_action('woocommerce_checkout_order_processed', 'animalia_repartos_on_pending_manual', 25, 1);
function animalia_repartos_on_pending_manual( $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order ) return;
    if ( $order->get_meta('_animalia_repartos_notificado') ) return;
    if ( $order->get_status() !== 'pending' ) return;

    $metodo = strtolower( $order->get_payment_method_title() ?: '' );
    // Métodos que dejan el pedido en 'pending' hasta que el admin confirme el pago.
    $corroborar = [
        'dinero disponible en mercado pago o transferencia bancaria',
        'modo + bbva',
    ];
    foreach ( $corroborar as $needle ) {
        if ( strpos($metodo, $needle) !== false ) {
            animalia_repartos_enviar( $order_id );
            return;
        }
    }
}

/**
 * Construye y envía el payload al backend de la app.
 */
function animalia_repartos_enviar( $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order ) return;
    if ( $order->get_meta('_animalia_repartos_notificado') ) return;

    // ===== Filtros previos (el backend igual revalida) =====

    // 1) Retiro en local
    $envio = method_exists($order, 'get_shipping_method') ? $order->get_shipping_method() : '';
    $envio_low = strtolower( $envio );
    if ( strpos($envio_low, 'retiro') !== false || strpos($envio_low, 'sucursal') !== false ) {
        $order->update_meta_data('_animalia_repartos_notificado', 'skip_retiro');
        $order->save();
        return;
    }

    // 2) CP fuera de MDP (todos los CPs MdP empiezan con 76, ej 7600, 7603, etc.)
    $cp = preg_replace('/^B?/i', '', trim( $order->get_shipping_postcode() ?: '' ));
    if ( $cp && ! preg_match('/^76\d{2}$/', $cp) ) {
        $order->update_meta_data('_animalia_repartos_notificado', 'skip_fuera_mdp');
        $order->save();
        return;
    }

    // ===== Armado del payload =====

    $nombre_cliente = trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() );
    $telefono = $order->get_billing_phone() ?: '';
    $dni = $order->get_meta('_billing_dni') ?: '';

    $direccion_envio = trim( $order->get_shipping_address_1() );
    if ( $order->get_shipping_address_2() ) {
        $direccion_envio .= ', ' . $order->get_shipping_address_2();
    }

    $ciudad = $order->get_shipping_city() ?: 'Mar del Plata';
    $nota = $order->get_customer_note() ?: '';
    $metodo_pago = $order->get_payment_method_title() ?: '';

    // Items con cantidad, precio unitario y total
    $productos = [];
    foreach ( $order->get_items() as $item ) {
        $productos[] = [
            'nombre' => $item->get_name(),
            'cantidad' => $item->get_quantity(),
            'precio_unitario' => $order->get_item_subtotal( $item, false ),
            'total' => $item->get_total(),
        ];
    }

    // Descuentos por cupones
    $descuentos = 0;
    foreach ( $order->get_items('coupon') as $coupon ) {
        $descuentos += (float) $coupon->get_discount();
    }

    $subtotal = (float) $order->get_subtotal();
    $total = (float) $order->get_total(); // El dato definitivo: lo que paga el cliente

    $payload = [
        'origen' => 'woocommerce',
        'order_id' => (int) $order->get_id(),
        'order_number' => (string) $order->get_order_number(),
        'fecha' => $order->get_date_created() ? $order->get_date_created()->date('Y-m-d H:i:s') : current_time('mysql'),
        'fecha_reparto' => date('Y-m-d'), // hoy por defecto; editable desde la app
        'nombre_cliente' => $nombre_cliente,
        'telefono' => $telefono,
        'dni' => $dni,
        'direccion_envio' => $direccion_envio,
        'ciudad' => $ciudad,
        'codigo_postal' => $cp,
        'nota' => $nota,
        'productos' => $productos,
        'metodo_pago' => $metodo_pago,
        'subtotal' => $subtotal,
        'descuentos' => $descuentos,
        'total' => $total,
        'modalidad_envio' => $envio,
        'estado_woocommerce' => $order->get_status(),
        // 'pagado' lo decide el backend usando metodo_pago. Lo mandamos como pista nomás.
        'pagado' => in_array($order->get_status(), ['processing', 'completed'], true),
    ];

    // Envoltorio defensivo: si algo falla, el pedido en Woo NO se ve afectado.
    try {
        $response = wp_remote_post( ANIMALIA_REPARTOS_URL, [
            'method' => 'POST',
            'timeout' => 5,            // bajo timeout para no demorar el checkout
            'redirection' => 0,
            'blocking' => true,
            'sslverify' => true,
            'headers' => [
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . ANIMALIA_REPARTOS_KEY,
            ],
            'body' => wp_json_encode( $payload ),
        ] );

        if ( is_wp_error( $response ) ) {
            error_log('[Animalia Repartos] Error envío pedido ' . $order_id . ': ' . $response->get_error_message());
            return;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $body = wp_remote_retrieve_body( $response );

        if ( $code >= 200 && $code < 300 ) {
            $order->update_meta_data('_animalia_repartos_notificado', '1');
            $order->update_meta_data('_animalia_repartos_response', substr($body, 0, 1000));
            $order->save();
        } else {
            error_log('[Animalia Repartos] Pedido ' . $order_id . ' HTTP ' . $code . ': ' . $body);
        }
    } catch ( \Throwable $e ) {
        // Cualquier excepcion inesperada queda registrada pero no se propaga.
        error_log('[Animalia Repartos] Excepcion en pedido ' . $order_id . ': ' . $e->getMessage());
    }
}
