import { pool, withTransaction } from '../config/db.js';
import { geocodeAddress } from './geocodingService.js';

const ORDER_COLUMNS = `
  o.*, s.name AS store_name
`;

export async function listOrders(filters = {}) {
  const where = [];
  const params = {};

  if (filters.date) {
    where.push('o.scheduled_delivery_date = :date');
    params.date = filters.date;
  }
  if (filters.status === 'finalizados') {
    where.push("o.status IN ('entregado', 'cancelado', 'no_entregado')");
  } else if (filters.status) {
    where.push('o.status = :status');
    params.status = filters.status;
  } else {
    where.push("o.status NOT IN ('entregado', 'cancelado', 'no_entregado')");
  }
  if (filters.store_id) {
    where.push('o.store_id = :storeId');
    params.storeId = Number(filters.store_id);
  }
  if (filters.payment_method) {
    where.push('o.payment_method = :paymentMethod');
    params.paymentMethod = filters.payment_method;
  }

  const sql = `
    SELECT ${ORDER_COLUMNS}
    FROM orders o
    LEFT JOIN stores s ON s.id = o.store_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY o.priority DESC, o.time_window_start IS NULL, o.time_window_start ASC, o.order_date DESC, o.id DESC
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
  const geocoded = await geocodeAddress(payload.domicilio);

  return createOrder({
    origin: 'manual',
    order_date: new Date(),
    scheduled_delivery_date: payload.fecha_reparto || payload.fecha || today(),
    customer_name: payload.cliente,
    phone: payload.telefono,
    address: payload.domicilio,
    between_streets: payload.entre_calles,
    internal_notes: payload.observaciones,
    payment_method: payload.forma_pago,
    payment_status: Number(payload.importe_a_cobrar || 0) > 0 ? 'a_cobrar' : 'cobrado',
    amount_to_collect: Number(payload.importe_a_cobrar || 0),
    total: Number(payload.importe_a_cobrar || 0),
    time_condition: null,
    time_window_start: payload.rango_horario_desde || null,
    time_window_end: payload.rango_horario_hasta || null,
    store_id: 2,
    latitude: geocoded?.latitude || null,
    longitude: geocoded?.longitude || null,
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

  const geocoded = await geocodeAddress(payload.direccion_envio);

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
    payment_method: payload.metodo_pago,
    payment_status: payload.requiere_corroborrar_pago ? 'corroborar_pago' : 'cobrado',
    amount_to_collect: payload.requiere_corroborrar_pago ? Number(payload.total || 0) : 0,
    subtotal: Number(payload.subtotal || 0),
    discounts: Number(payload.descuentos || 0),
    total: Number(payload.total || 0),
    delivery_mode: payload.modalidad_envio,
    latitude: geocoded?.latitude || null,
    longitude: geocoded?.longitude || null,
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

  if (payload.address && payload.address !== existing.address && !payload.latitude && !payload.longitude) {
    const geocoded = await geocodeAddress(payload.address);
    if (geocoded) {
      payload.latitude = geocoded.latitude;
      payload.longitude = geocoded.longitude;
    }
  }

  const fields = allowed.filter((field) => Object.prototype.hasOwnProperty.call(payload, field));
  if (!fields.length) return getOrder(id);

  const setSql = fields.map((field) => `${field} = :${field}`).join(', ');
  await pool.execute(`UPDATE orders SET ${setSql} WHERE id = :id`, { ...payload, id });
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
  if (Array.isArray(productos)) return productos;
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

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, value === undefined ? null : value])
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
