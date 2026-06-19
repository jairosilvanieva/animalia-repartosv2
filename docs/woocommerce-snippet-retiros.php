<?php
/**
 * Animalia Repartos — Snippet para RETIROS en local.
 *
 * Solo envía a la app los pedidos cuyo método de envío contiene
 * 'retiro' o 'sucursal'. Convive sin conflicto con el snippet
 * de repartos (usa meta key propia: _animalia_retiros_notificado).
 *
 * Configuración:
 *  - ANIMALIA_REPARTOS_URL y ANIMALIA_REPARTOS_KEY: mismo endpoint
 *    y misma API key que el snippet de repartos.
 */

if ( ! defined('ABSPATH') ) exit;

if ( ! defined('ANIMALIA_REPARTOS_URL') ) {
    define('ANIMALIA_REPARTOS_URL', 'https://reparto.animalia.com.ar/api/orders/from-woocommerce');
}
if ( ! defined('ANIMALIA_REPARTOS_KEY') ) {
    define('ANIMALIA_REPARTOS_KEY', '7b2c35295b648e5c96e207a586e6defb9371abb9eb63ee0f4c930452a77ec47f');
}

add_action('woocommerce_order_status_changed', 'animalia_retiros_on_status_change', 25, 4);
function animalia_retiros_on_status_change( $order_id, $from, $to, $order ) {
    if ( ! $order ) return;
    if ( $order->get_meta('_animalia_retiros_notificado') ) return;
    if ( in_array($to, ['processing', 'completed'], true) ) {
        animalia_retiros_enviar( $order_id );
    }
}

add_action('woocommerce_checkout_order_processed', 'animalia_retiros_on_pending_manual', 25, 1);
function animalia_retiros_on_pending_manual( $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order ) return;
    if ( $order->get_meta('_animalia_retiros_notificado') ) return;
    if ( $order->get_status() !== 'pending' ) return;

    $metodo = strtolower( $order->get_payment_method_title() ?: '' );
    $corroborar = [
        'dinero disponible en mercado pago o transferencia bancaria',
        'modo + bbva',
        'promo bbva (pago online',
    ];
    foreach ( $corroborar as $needle ) {
        if ( strpos($metodo, $needle) !== false ) {
            animalia_retiros_enviar( $order_id );
            return;
        }
    }
}

function animalia_retiros_enviar( $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order ) return;
    if ( $order->get_meta('_animalia_retiros_notificado') ) return;

    // Solo seguimos si es retiro en local.
    $envio = method_exists($order, 'get_shipping_method') ? $order->get_shipping_method() : '';
    $envio_low = strtolower( $envio );
    $es_retiro = ( strpos($envio_low, 'retiro') !== false || strpos($envio_low, 'sucursal') !== false );
    if ( ! $es_retiro ) return;

    $nombre_cliente = trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() );
    $telefono = $order->get_billing_phone() ?: '';
    $dni = $order->get_meta('_billing_dni') ?: '';
    $nota = $order->get_customer_note() ?: '';
    $metodo_pago = $order->get_payment_method_title() ?: '';

    // Para retiros usamos domicilio de facturación como referencia.
    $direccion = trim( $order->get_billing_address_1() ?: '' );
    $ciudad = $order->get_billing_city() ?: 'Mar del Plata';

    $productos = [];
    foreach ( $order->get_items() as $item ) {
        $productos[] = [
            'nombre'          => $item->get_name(),
            'cantidad'        => $item->get_quantity(),
            'precio_unitario' => $order->get_item_subtotal( $item, false ),
            'total'           => $item->get_total(),
        ];
    }

    $descuentos = 0;
    foreach ( $order->get_items('coupon') as $coupon ) {
        $descuentos += (float) $coupon->get_discount();
    }

    $payload = [
        'origen'             => 'woocommerce',
        'tipo'               => 'retiro',
        'order_id'           => (int) $order->get_id(),
        'order_number'       => (string) $order->get_order_number(),
        'fecha'              => $order->get_date_created()
                                    ? $order->get_date_created()->date('Y-m-d H:i:s')
                                    : current_time('mysql'),
        'fecha_reparto'      => date('Y-m-d'),
        'nombre_cliente'     => $nombre_cliente,
        'telefono'           => $telefono,
        'dni'                => $dni,
        'direccion_envio'    => $direccion ?: 'Retiro en local',
        'ciudad'             => $ciudad,
        'nota'               => $nota,
        'productos'          => $productos,
        'metodo_pago'        => $metodo_pago,
        'subtotal'           => (float) $order->get_subtotal(),
        'descuentos'         => $descuentos,
        'total'              => (float) $order->get_total(),
        'modalidad_envio'    => $envio,
        'estado_woocommerce' => $order->get_status(),
        'pagado'             => in_array($order->get_status(), ['processing', 'completed'], true),
    ];

    try {
        $response = wp_remote_post( ANIMALIA_REPARTOS_URL, [
            'method'      => 'POST',
            'timeout'     => 5,
            'redirection' => 0,
            'blocking'    => true,
            'sslverify'   => true,
            'headers'     => [
                'Content-Type'  => 'application/json',
                'Authorization' => 'Bearer ' . ANIMALIA_REPARTOS_KEY,
            ],
            'body' => wp_json_encode( $payload ),
        ] );

        if ( is_wp_error( $response ) ) {
            error_log('[Animalia Retiros] Error envio pedido ' . $order_id . ': ' . $response->get_error_message());
            return;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $body = wp_remote_retrieve_body( $response );

        if ( $code >= 200 && $code < 300 ) {
            $order->update_meta_data('_animalia_retiros_notificado', '1');
            $order->update_meta_data('_animalia_retiros_response', substr($body, 0, 1000));
            $order->save();
        } else {
            error_log('[Animalia Retiros] Pedido ' . $order_id . ' HTTP ' . $code . ': ' . $body);
        }
    } catch ( \Throwable $e ) {
        error_log('[Animalia Retiros] Excepcion en pedido ' . $order_id . ': ' . $e->getMessage());
    }
}
