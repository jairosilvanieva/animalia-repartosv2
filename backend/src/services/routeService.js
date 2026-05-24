import { pool, withTransaction } from '../config/db.js';

const BASE = {
  address: 'Sarmiento 2790, Mar del Plata, Buenos Aires',
  latitude: -38.0089,
  longitude: -57.5502
};

export async function createRoute(payload) {
  const orderIds = (payload.order_ids || []).map(Number).filter(Boolean);
  if (!orderIds.length) {
    const error = new Error('Selecciona al menos un pedido.');
    error.status = 400;
    throw error;
  }

  const [orders] = await pool.query(
    `SELECT * FROM orders WHERE id IN (?) ORDER BY priority DESC, time_window_start ASC, order_date ASC`,
    [orderIds]
  );
  const eligible = orders.filter((order) => ['pendiente', 'no_entregado'].includes(order.status));

  if (!eligible.length) {
    const error = new Error('No hay pedidos aptos para repartir.');
    error.status = 400;
    throw error;
  }

  const ordered = orderStops(eligible);

  const routeId = await withTransaction(async (connection) => {
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

    return routeId;
  });

  return getRoute(routeId);
}

export async function listRoutes(filters = {}) {
  const params = {};
  const where = [];

  if (filters.route_date) {
    where.push('dr.route_date = :routeDate');
    params.routeDate = filters.route_date;
  }

  if (filters.status) {
    where.push('dr.status = :status');
    params.status = filters.status;
  }

  const [routes] = await pool.execute(
    `SELECT dr.*, COUNT(rs.id) AS stops_count
     FROM delivery_routes dr
     LEFT JOIN route_stops rs ON rs.route_id = dr.id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     GROUP BY dr.id
     ORDER BY dr.created_at DESC, dr.id DESC`,
    params
  );

  return routes;
}

export async function getRoute(id) {
  const [routes] = await pool.execute('SELECT * FROM delivery_routes WHERE id = :id', { id });
  if (!routes.length) return null;

  const [stops] = await pool.execute(
    `SELECT rs.*, o.customer_name, o.phone, o.address, o.between_streets, o.payment_method,
            o.amount_to_collect, o.internal_notes, o.time_condition, o.time_window_start,
            o.time_window_end, o.latitude, o.longitude
     FROM route_stops rs
     JOIN orders o ON o.id = rs.order_id
     WHERE rs.route_id = :id
     ORDER BY rs.stop_order`,
    { id }
  );

  return { ...routes[0], stops };
}

export async function startRoute(id) {
  await withTransaction(async (connection) => {
    await connection.execute(
      `UPDATE delivery_routes SET status = 'activa' WHERE id = :id`,
      { id }
    );
    await connection.execute(
      `UPDATE route_stops SET status = 'en_camino' WHERE route_id = :id AND status = 'pendiente'`,
      { id }
    );
    await connection.execute(
      `UPDATE orders o
       JOIN route_stops rs ON rs.order_id = o.id
       SET o.status = 'en_camino'
       WHERE rs.route_id = :id AND o.status IN ('pendiente', 'no_entregado')`,
      { id }
    );
  });

  return getRoute(id);
}

export async function updateStop(routeId, stopId, payload) {
  const status = payload.status;
  const allowed = ['pendiente', 'en_camino', 'entregado', 'no_entregado'];
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
  const priority = orders.filter((order) => order.priority);
  const normal = orders.filter((order) => !order.priority);
  return [
    ...nearestNeighbor(priority, BASE),
    ...nearestNeighbor(normal, BASE)
  ];
}

function nearestNeighbor(orders, origin) {
  const withCoords = orders.filter((order) => order.latitude && order.longitude);
  const withoutCoords = orders
    .filter((order) => !order.latitude || !order.longitude)
    .sort((a, b) => timeValue(a) - timeValue(b));

  const ordered = [];
  const pending = [...withCoords];
  let cursor = origin;

  while (pending.length) {
    pending.sort((a, b) => distance(cursor, a) - distance(cursor, b));
    const next = pending.shift();
    ordered.push(next);
    cursor = next;
  }

  return [...ordered, ...withoutCoords];
}

function timeValue(order) {
  if (!order.time_window_start) return Number.MAX_SAFE_INTEGER;
  const [hours, minutes] = String(order.time_window_start).split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

function distance(a, b) {
  const lat1 = Number(a.latitude);
  const lon1 = Number(a.longitude);
  const lat2 = Number(b.latitude);
  const lon2 = Number(b.longitude);
  return Math.hypot(lat1 - lat2, lon1 - lon2);
}
