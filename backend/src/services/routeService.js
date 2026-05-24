import { pool, withTransaction } from '../config/db.js';

const BASE = {
  address: 'Sarmiento y Garay, Mar del Plata, Buenos Aires',
  latitude: -38.0123,
  longitude: -57.5496
};

export async function createRoute(payload) {
  const orderIds = (payload.order_ids || []).map(Number).filter(Boolean);
  if (!orderIds.length) {
    const error = new Error('Selecciona al menos un pedido.');
    error.status = 400;
    throw error;
  }

  const [orders] = await pool.query(
    `SELECT * FROM orders WHERE id IN (?) ORDER BY priority DESC, order_date ASC`,
    [orderIds]
  );
  const eligible = orders.filter((order) => order.status === 'listo_para_repartir');

  if (!eligible.length) {
    const error = new Error('No hay pedidos aptos para repartir.');
    error.status = 400;
    throw error;
  }

  const ordered = orderStops(eligible);

  return withTransaction(async (connection) => {
    const [routeResult] = await connection.execute(
      `INSERT INTO delivery_routes (name, route_date, driver_id, status)
       VALUES (:name, :routeDate, :driverId, 'borrador')`,
      {
        name: payload.name || `Reparto ${payload.route_date}`,
        routeDate: payload.route_date,
        driverId: payload.driver_id || null
      }
    );

    const routeId = routeResult.insertId;
    for (const [index, order] of ordered.entries()) {
      await connection.execute(
        `INSERT INTO route_stops (route_id, order_id, stop_order)
         VALUES (:routeId, :orderId, :stopOrder)`,
        { routeId, orderId: order.id, stopOrder: index + 1 }
      );
    }

    return getRoute(routeId);
  });
}

export async function getRoute(id) {
  const [routes] = await pool.execute('SELECT * FROM delivery_routes WHERE id = :id', { id });
  if (!routes.length) return null;

  const [stops] = await pool.execute(
    `SELECT rs.*, o.customer_name, o.phone, o.address, o.between_streets, o.payment_method,
            o.amount_to_collect, o.internal_notes, o.time_condition, o.latitude, o.longitude
     FROM route_stops rs
     JOIN orders o ON o.id = rs.order_id
     WHERE rs.route_id = :id
     ORDER BY rs.stop_order`,
    { id }
  );

  return { ...routes[0], stops };
}

export async function updateStop(routeId, stopId, payload) {
  const status = payload.status;
  const allowed = ['pendiente', 'en_camino', 'entregado', 'no_entregado', 'problema'];
  if (!allowed.includes(status)) {
    const error = new Error('Estado de parada invalido.');
    error.status = 400;
    throw error;
  }

  await withTransaction(async (connection) => {
    await connection.execute(
      `UPDATE route_stops
       SET status = :status, problem_note = :problemNote, delivered_at = IF(:status = 'entregado', NOW(), delivered_at)
       WHERE id = :stopId AND route_id = :routeId`,
      { status, problemNote: payload.problem_note || null, stopId, routeId }
    );

    const orderStatus = status === 'entregado' ? 'entregado'
      : status === 'no_entregado' ? 'no_entregado'
      : status === 'en_camino' ? 'en_camino'
      : null;

    if (orderStatus) {
      await connection.execute(
        `UPDATE orders o
         JOIN route_stops rs ON rs.order_id = o.id
         SET o.status = :orderStatus
         WHERE rs.id = :stopId AND rs.route_id = :routeId`,
        { orderStatus, stopId, routeId }
      );
    }
  });

  return getRoute(routeId);
}

function orderStops(orders) {
  const priorityBuckets = [...orders].sort((a, b) => scoreTime(a) - scoreTime(b));
  const withCoords = priorityBuckets.filter((order) => order.latitude && order.longitude);
  const withoutCoords = priorityBuckets.filter((order) => !order.latitude || !order.longitude);

  const ordered = [];
  let cursor = BASE;
  const pending = [...withCoords];

  while (pending.length) {
    pending.sort((a, b) => distance(cursor, a) - distance(cursor, b));
    const next = pending.shift();
    ordered.push(next);
    cursor = next;
  }

  return [...ordered, ...withoutCoords];
}

function scoreTime(order) {
  const condition = String(order.time_condition || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (order.priority) return 0;
  if (condition.includes('antes') || condition.includes('manana')) return 1;
  if (condition.includes('despues') || condition.includes('tarde')) return 3;
  return 2;
}

function distance(a, b) {
  const lat1 = Number(a.latitude);
  const lon1 = Number(a.longitude);
  const lat2 = Number(b.latitude);
  const lon2 = Number(b.longitude);
  return Math.hypot(lat1 - lat2, lon1 - lon2);
}
