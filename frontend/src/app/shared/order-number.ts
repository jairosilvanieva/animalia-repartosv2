// Helper para mostrar el numero de pedido con prefijo segun origen.
// - WooCommerce: W-<order_number> (numero que viene del sitio)
// - Manual:      M-<id> (autoincremento interno)

interface OrderLike {
  id?: number;
  origin?: string;
  order_number?: string | null;
}

export function orderDisplayNumber(order: OrderLike | null | undefined): string {
  if (!order) return '';
  if (order.origin === 'woocommerce' && order.order_number) {
    return `W-${order.order_number}`;
  }
  if (order.id != null) {
    return `M-${order.id}`;
  }
  return '';
}
