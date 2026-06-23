// Helper para mostrar el numero de pedido con prefijo segun origen.
// - WooCommerce: W-<order_number> (numero que viene del sitio)
// - Manual:      M-<id> (autoincremento interno)

interface OrderLike {
  id?: number;
  origin?: string;
  order_number?: string | null;
  store_id?: number | null;
}

const STORE_PREFIX: Record<number, string> = { 1: 'MC', 2: 'MS', 3: 'MG' };

export function orderDisplayNumber(order: OrderLike | null | undefined): string {
  if (!order) return '';
  if (order.origin === 'woocommerce' && order.order_number) {
    return `W-${order.order_number}`;
  }
  if (order.id != null) {
    const prefix = (order.store_id && STORE_PREFIX[order.store_id]) ? STORE_PREFIX[order.store_id] : 'M';
    return `${prefix}-${order.id}`;
  }
  return '';
}
