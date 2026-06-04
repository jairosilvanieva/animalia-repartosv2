import { pool, withTransaction } from '../config/db.js';

const ORDER_COLUMNS = `
  o.*, s.name AS store_name
`;

const ORDER_LIST_COLUMNS = `
  o.*, s.name AS store_name,
  COALESCE(item_summary.items_count, 0) AS items_count,
  item_summary.products_summary,
  current_route.route_id AS current_route_id,
  current_route.route_status AS current_route_status,
  current_route.stop_order AS current_route_stop_order
`;

export async function listOrders(filters = {}) {
  const where = [];
  const params = {};

  if (filters.date) {
    where.push('o.scheduled_delivery_date = :date');
    params.date = filters.date;
  }
  if (filters.status === 'todos') {
    // Sin filtro por estado.
  } else if (filters.status === 'finalizados') {
    where.push("o.status IN ('entregado', 'cancelado')");
  } else if (filters.status) {
    where.push('o.status = :status');
    params.status = filters.status;
  } else {
    where.push("o.status NOT IN ('entregado', 'cancelado')");
  }
  if (filters.store_id) {
    where.push('o.store_id = :storeId');
    params.storeId = Number(filters.store_id);
  }
  if (filters.payment_method) {
    where.push('o.payment_method = :paymentMethod');
    params.paymentMethod = filters.payment_method;
  }
  if (filters.search) {
    where.push(`(
      o.customer_name LIKE :search
      OR o.phone LIKE :search
      OR o.address LIKE :search
      OR o.order_number LIKE :search
    )`);
    params.search = `%${filters.search}%`;
  }

  const sql = `
    SELECT ${ORDER_LIST_COLUMNS}
    FROM orders o
    LEFT JOIN stores s ON s.id = o.store_id
    LEFT JOIN (
      SELECT
        order_id,
        COUNT(*) AS items_count,
        GROUP_CONCAT(
          CONCAT(
            CASE WHEN quantity = FLOOR(quantity) THEN CAST(quantity AS UNSIGNED) ELSE quantity END,
            ' x ',
            product_name
          )
          ORDER BY id SEPARATOR ' | '
        ) AS products_summary
      FROM order_items
      GROUP BY order_id
    ) item_summary ON item_summary.order_id = o.id
    LEFT JOIN (
      SELECT rs.order_id, rs.route_id, rs.stop_order, dr.status AS route_status
        FROM route_stops rs
        JOIN delivery_routes dr ON dr.id = rs.route_id
       WHERE dr.status IN ('borrador', 'activa')
         AND rs.status NOT IN ('entregado', 'no_entregado')
    ) current_route ON current_route.order_id = o.id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY
      o.priority DESC,
      o.time_window_start IS NULL,
      o.time_window_start ASC,
      o.order_date ASC,
      o.id ASC
  `;

  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getOrder(id) {
  const [orders] = await pool.execute(
    `SELECT ${ORDER_COLUMNS} FROM orders o LEFT JOIN stores s ON s.id = o.store_id WHERE o.id = :id`,
    { id }
  );
  if (!orders.length) return null;

  const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = :id ORDER BY id', { id });
  return { ...orders[0], items };
}

export async function createManualOrder(payload) {
  const paymentMethod = normalizePaymentMethod(payload.forma_pago);
  const total = Number(payload.total ?? payload.importe_a_cobrar ?? 0);
  const paymentStatus = payload.pagado ? 'cobrado' : 'a_cobrar';

  return createOrder({
    origin: 'manual',
    order_date: new Date(),
    scheduled_delivery_date: payload.fecha_reparto || payload.fecha || today(),
    customer_name: payload.cliente,
    phone: payload.telefono,
    address: payload.domicilio,
    between_streets: payload.entre_calles,
    internal_notes: payload.observaciones,
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    amount_to_collect: payload.pagado ? 0 : total,
    total,
    time_condition: null,
    time_window_start: payload.rango_horario_desde || null,
    time_window_end: payload.rango_horario_hasta || null,
    store_id: 2,
    latitude: payload.latitude || null,
    longitude: payload.longitude || null,
    status: payload.estado || 'pendiente',
    items: normalizeManualItems(payload.productos)
  });
}

export async function createWooCommerceOrder(payload) {
  const [existing] = await pool.execute(
    'SELECT id FROM orders WHERE woocommerce_order_id = :woocommerceOrderId',
    { woocommerceOrderId: payload.order_id }
  );
  if (existing.length) {
    return getOrder(existing[0].id);
  }

  const paymentMethod = normalizePaymentMethod(payload.metodo_pago);
  const total = Number(payload.total || 0);

  // Clasificación robusta basada en el método de pago, no en el flag del cliente.
  const paymentStatus = classifyPayment(payload.metodo_pago);
  const amountToCollect = paymentStatus === 'a_cobrar' ? total : 0;

  return createOrder({
    origin: 'woocommerce',
    woocommerce_order_id: payload.order_id,
    order_number: payload.order_number,
    order_date: payload.fecha || new Date(),
    scheduled_delivery_date: payload.fecha_reparto || today(),
    customer_name: payload.nombre_cliente,
    phone: payload.telefono,
    dni: payload.dni,
    address: payload.direccion_envio,
    city: payload.ciudad || 'Mar del Plata',
    postal_code: payload.codigo_postal,
    customer_note: payload.nota,
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    amount_to_collect: amountToCollect,
    subtotal: Number(payload.subtotal || 0),
    discounts: Number(payload.descuentos || 0),
    total,
    delivery_mode: payload.modalidad_envio,
    latitude: payload.latitude || null,
    longitude: payload.longitude || null,
    status: 'pendiente',
    woocommerce_status: payload.estado_woocommerce,
    items: normalizeWooItems(payload.productos)
  });
}

export async function updateOrder(id, payload) {
  const allowed = [
    'customer_name',
    'scheduled_delivery_date',
    'phone',
    'dni',
    'address',
    'between_streets',
    'city',
    'postal_code',
    'customer_note',
    'internal_notes',
    'payment_method',
    'payment_status',
    'amount_to_collect',
    'total',
    'delivery_mode',
    'time_condition',
    'time_window_start',
    'time_window_end',
    'priority',
    'status',
    'store_id',
    'latitude',
    'longitude'
  ];

  const existing = await getOrder(id);
  if (!existing) return null;
  const shouldUpdateItems = Object.prototype.hasOwnProperty.call(payload, 'items');

  const fields = allowed.filter((field) => Object.prototype.hasOwnProperty.call(payload, field));
  if (!fields.length && !shouldUpdateItems) return getOrder(id);

  await withTransaction(async (connection) => {
    if (fields.length) {
      const setSql = fields.map((field) => `${field} = :${field}`).join(', ');
      await connection.execute(`UPDATE orders SET ${setSql} WHERE id = :id`, cleanParams({ ...payload, id }));
    }

    if (shouldUpdateItems) {
      const items = normalizeManualItems(payload.items);
      await connection.execute('DELETE FROM order_items WHERE order_id = :id', { id });

      for (const item of items) {
        await connection.execute(
          `INSERT INTO order_items (order_id, product_name, quantity, unit_price, total)
           VALUES (:orderId, :productName, :quantity, :unitPrice, :total)`,
          {
            orderId: id,
            productName: item.product_name,
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unit_price || 0),
            total: Number(item.total || 0)
          }
        );
      }
    }
  });

  return getOrder(id);
}

async function createOrder(order) {
  const orderId = await withTransaction(async (connection) => {
    const params = cleanParams({
      woocommerce_order_id: null,
      order_number: null,
      scheduled_delivery_date: today(),
      dni: null,
      between_streets: null,
      city: 'Mar del Plata',
      postal_code: null,
      customer_note: null,
      internal_notes: null,
      payment_method: null,
      payment_status: 'a_cobrar',
      amount_to_collect: 0,
      subtotal: 0,
      discounts: 0,
      total: 0,
      delivery_mode: null,
      time_condition: null,
      time_window_start: null,
      time_window_end: null,
      priority: false,
      status: 'pendiente',
      woocommerce_status: null,
      store_id: null,
      latitude: null,
      longitude: null,
      ...order
    });

    const [result] = await connection.execute(
      `INSERT INTO orders (
        origin, woocommerce_order_id, order_number, order_date, scheduled_delivery_date, customer_name, phone, dni,
        address, between_streets, city, postal_code, customer_note, internal_notes,
        payment_method, payment_status, amount_to_collect, subtotal, discounts, total,
        delivery_mode, time_condition, time_window_start, time_window_end, priority, status, woocommerce_status,
        store_id, latitude, longitude
      ) VALUES (
        :origin, :woocommerce_order_id, :order_number, :order_date, :scheduled_delivery_date, :customer_name, :phone, :dni,
        :address, :between_streets, :city, :postal_code, :customer_note, :internal_notes,
        :payment_method, :payment_status, :amount_to_collect, :subtotal, :discounts, :total,
        :delivery_mode, :time_condition, :time_window_start, :time_window_end, :priority, :status, :woocommerce_status,
        :store_id, :latitude, :longitude
      )`,
      params
    );

    const orderId = result.insertId;
    for (const item of order.items || []) {
      await connection.execute(
        `INSERT INTO order_items (order_id, product_name, quantity, unit_price, total)
         VALUES (:orderId, :productName, :quantity, :unitPrice, :total)`,
        {
          orderId,
          productName: item.product_name,
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unit_price || 0),
          total: Number(item.total || 0)
        }
      );
    }

    return orderId;
  });

  return getOrder(orderId);
}

function normalizeManualItems(productos) {
  if (Array.isArray(productos)) {
    return productos
      .map((item) => ({
        product_name: item.product_name || item.nombre || item.name || '',
        quantity: Number(item.quantity || item.cantidad || 1),
        unit_price: Number(item.unit_price || 0),
        total: Number(item.total || 0)
      }))
      .filter((item) => item.product_name);
  }
  return String(productos || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((product_name) => ({ product_name, quantity: 1, unit_price: 0, total: 0 }));
}

function normalizeWooItems(productos) {
  if (!Array.isArray(productos)) return [];
  return productos.map((item) => ({
    product_name: item.nombre || item.name || item.product_name,
    quantity: item.cantidad || item.quantity || 1,
    unit_price: item.precio_unitario || item.unit_price || 0,
    total: item.total || 0
  }));
}

function normalizePaymentMethod(method = '') {
  const value = String(method || '').trim();
  const lower = value.toLowerCase();

  if (!value) return null;
  if (lower.includes('modo') && lower.includes('bbva')) return 'BBVA + MODO';
  if (lower.includes('promo bbva') || (lower.includes('bbva') && lower.includes('martes'))) return 'BBVA tarjeta - 40%';
  if (lower.includes('bbva') && lower.includes('10%')) return 'BBVA 10% + 3 cuotas';
  if (lower.includes('galicia') && lower.includes('modo')) return 'Galicia + MODO';
  if (lower.includes('galicia')) return 'Galicia tarjeta fisica';
  if (lower.includes('cuenta dni')) return 'Cuenta DNI';
  if (lower.includes('modo')) return 'MODO - 20%';
  if (lower.includes('mercado pago') || lower.includes('transferencia')) return 'Tarjeta 1 pago / Transf.';
  if (lower.includes('tarjeta') && lower.includes('3')) return 'Tarjeta 3 cuotas';
  if (lower.includes('efectivo')) return 'Efectivo';
  if (lower.includes('local')) return 'Pago en local';

  return value;
}

// Clasifica el método de pago crudo de Woo en una de las 3 categorías de la app.
// Comparación case-insensitive sobre payment_method_title.
// Default = corroborar_pago (conservador: si no lo conocemos, que lo revise el admin).
const PAYMENT_RULES = {
  cobrado: [
    'modo + galicia',
    'tarjeta de débito o crédito en 1 pago',
    'tarjeta de debito o credito en 1 pago',
    'modo'
  ],
  corroborar_pago: [
    'dinero disponible en mercado pago o transferencia bancaria',
    'modo + bbva'
  ],
  a_cobrar: [
    'efectivo (15% de descuento)',
    'cuenta dni',
    '3 cuotas sin interés (pago presencial)',
    '3 cuotas sin interes (pago presencial)',
    'plan z naranja x',
    'promo bbva (pago presencial)'
  ]
};

export function classifyPayment(methodTitle = '') {
  const t = String(methodTitle || '').toLowerCase().trim();
  if (!t) return 'corroborar_pago';
  // Orden importa: a_cobrar tiene reglas con "presencial" que ganan sobre "modo" o "bbva" genéricas.
  if (PAYMENT_RULES.a_cobrar.some((k) => t.includes(k))) return 'a_cobrar';
  if (PAYMENT_RULES.corroborar_pago.some((k) => t.includes(k))) return 'corroborar_pago';
  if (PAYMENT_RULES.cobrado.some((k) => t.includes(k))) return 'cobrado';
  return 'corroborar_pago'; // default conservador
}

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, value === undefined ? null : value])
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
