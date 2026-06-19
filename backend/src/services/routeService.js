import { pool, withTransaction } from '../config/db.js';

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

  // Bloquear pedidos que ya estén en una ruta no finalizada (borrador/activa)
  // PERO si en esa ruta ya quedaron como no_entregado, los liberamos para otra ruta.
  const [busy] = await pool.query(
    `SELECT DISTINCT rs.order_id, rs.route_id, dr.status AS route_status
       FROM route_stops rs
       JOIN delivery_routes dr ON dr.id = rs.route_id
      WHERE rs.order_id IN (?)
        AND dr.status IN ('borrador', 'activa')
        AND rs.status NOT IN ('no_entregado', 'entregado')`,
    [eligible.map((o) => o.id)]
  );
  const busyIds = new Set(busy.map((row) => row.order_id));
  const free = eligible.filter((o) => !busyIds.has(o.id));

  if (!free.length) {
    const routeIds = [...new Set(busy.map((row) => row.route_id))];
    const error = new Error(
      `Estos pedidos ya estan en otra ruta abierta (ruta ${routeIds.join(', ')}). Abrila o eliminala antes de armar una nueva.`
    );
    error.status = 409;
    error.existingRouteIds = routeIds;
    throw error;
  }

  const ordered = orderStops(free);

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

  if (filters.driver_view) {
    where.push("dr.status = 'activa'");
    // El chofer solo ve rutas libres o tomadas por él mismo.
    if (filters.current_user?.role === 'chofer') {
      where.push('(dr.driver_id IS NULL OR dr.driver_id = :currentUserId)');
      params.currentUserId = filters.current_user.id;
    }
  }

  const having = [];
  if (filters.driver_view) {
    having.push('workable_count > 0');
  }

  const [routes] = await pool.execute(
    `SELECT dr.*,
            COUNT(rs.id) AS stops_count,
            SUM(CASE WHEN rs.status = 'entregado' THEN 1 ELSE 0 END) AS delivered_count,
            SUM(CASE WHEN rs.status = 'no_entregado' THEN 1 ELSE 0 END) AS not_delivered_count,
            SUM(CASE WHEN rs.status IN ('pendiente', 'en_camino') THEN 1 ELSE 0 END) AS open_count,
            SUM(CASE WHEN rs.status IN ('pendiente', 'en_camino') THEN 1 ELSE 0 END) AS workable_count
     FROM delivery_routes dr
     LEFT JOIN route_stops rs ON rs.route_id = dr.id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     GROUP BY dr.id
     ${having.length ? `HAVING ${having.join(' AND ')}` : ''}
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
            o.payment_status, o.amount_to_collect, o.total, o.internal_notes, o.time_condition, o.time_window_start,
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
  const route = await getRoute(id);
  if (!route) return null;
  if (route.status !== 'borrador') {
    const error = new Error('Solo se puede cargar a camioneta una ruta preparada.');
    error.status = 400;
    throw error;
  }

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

export async function finishRoute(id, currentUser) {
  const route = await getRoute(id);
  if (!route) return null;
  if (route.status !== 'activa') {
    const error = new Error('Solo se puede finalizar una ruta activa.');
    error.status = 400;
    throw error;
  }

  // Si quien finaliza es chofer, solo puede cerrar su propia ruta tomada.
  if (currentUser?.role === 'chofer' && route.driver_id !== currentUser.id) {
    const error = new Error('Esta ruta no esta asignada a vos.');
    error.status = 403;
    throw error;
  }

  const openStops = route.stops.filter((stop) => ['pendiente', 'en_camino'].includes(stop.status));
  if (openStops.length) {
    const error = new Error('Todavia quedan paradas pendientes o en camino.');
    error.status = 400;
    throw error;
  }

  await pool.execute(
    `UPDATE delivery_routes SET status = 'finalizada' WHERE id = :id`,
    { id }
  );

  return getRoute(id);
}

// El chofer toma una ruta activa para comenzar a trabajarla.
// Reglas:
//  - La ruta tiene que estar 'activa'.
//  - Si ya esta tomada por otro chofer => error.
//  - Si el chofer ya tiene otra ruta activa tomada => error (debe terminarla primero).
export async function claimRoute(id, currentUser) {
  if (!currentUser?.id) {
    const error = new Error('No se identifico al usuario.');
    error.status = 401;
    throw error;
  }

  const route = await getRoute(id);
  if (!route) return null;
  if (route.status !== 'activa') {
    const error = new Error('Solo se pueden tomar rutas activas (cargadas a camioneta).');
    error.status = 400;
    throw error;
  }

  if (route.driver_id && route.driver_id !== currentUser.id) {
    const error = new Error('Esta ruta ya fue tomada por otro chofer.');
    error.status = 409;
    throw error;
  }

  if (!route.driver_id) {
    const [busy] = await pool.execute(
      `SELECT id, name FROM delivery_routes
        WHERE driver_id = :driverId AND status = 'activa' AND id <> :id
        LIMIT 1`,
      { driverId: currentUser.id, id }
    );
    if (busy.length) {
      const error = new Error(`Ya tenes una ruta en curso (ruta ${busy[0].id}). Terminala antes de tomar otra.`);
      error.status = 409;
      throw error;
    }

    await pool.execute(
      `UPDATE delivery_routes SET driver_id = :driverId WHERE id = :id`,
      { driverId: currentUser.id, id }
    );
  }

  return getRoute(id);
}

export async function addStopsToRoute(routeId, orderIds) {
  const route = await getRoute(routeId);
  if (!route) return null;
  if (!['borrador', 'activa'].includes(route.status)) {
    const error = new Error('Solo se pueden sumar pedidos a una ruta en borrador o activa.');
    error.status = 400;
    throw error;
  }

  const cleanIds = (orderIds || []).map(Number).filter(Boolean);
  if (!cleanIds.length) {
    const error = new Error('Sin pedidos para agregar.');
    error.status = 400;
    throw error;
  }

  const [orders] = await pool.query(
    `SELECT * FROM orders WHERE id IN (?)`,
    [cleanIds]
  );
  const eligible = orders.filter((order) => ['pendiente', 'no_entregado'].includes(order.status));
  if (!eligible.length) {
    const error = new Error('Ningun pedido apto para agregar.');
    error.status = 400;
    throw error;
  }

  // No agregar pedidos que ya estén ocupados en otra ruta abierta.
  const [busy] = await pool.query(
    `SELECT DISTINCT rs.order_id, rs.route_id
       FROM route_stops rs
       JOIN delivery_routes dr ON dr.id = rs.route_id
      WHERE rs.order_id IN (?)
        AND dr.status IN ('borrador', 'activa')
        AND rs.status NOT IN ('no_entregado', 'entregado')
        AND dr.id <> ?`,
    [eligible.map((o) => o.id), routeId]
  );
  const busyIds = new Set(busy.map((row) => row.order_id));
  const existingIds = new Set(route.stops.map((s) => s.order_id));
  const toAdd = eligible.filter((o) => !busyIds.has(o.id) && !existingIds.has(o.id));

  if (!toAdd.length) {
    const error = new Error('Esos pedidos ya estan en esta ruta o en otra ruta abierta.');
    error.status = 409;
    throw error;
  }

  let nextOrder = (route.stops.reduce((max, s) => Math.max(max, s.stop_order), 0)) + 1;
  const isActive = route.status === 'activa';

  await withTransaction(async (connection) => {
    for (const order of toAdd) {
      await connection.execute(
        `INSERT INTO route_stops (route_id, order_id, stop_order, status)
         VALUES (:routeId, :orderId, :stopOrder, :status)`,
        { routeId, orderId: order.id, stopOrder: nextOrder, status: isActive ? 'en_camino' : 'pendiente' }
      );
      nextOrder += 1;
      if (isActive) {
        await connection.execute(
          `UPDATE orders SET status = 'en_camino' WHERE id = :id AND status IN ('pendiente','no_entregado')`,
          { id: order.id }
        );
      }
    }
  });

  return getRoute(routeId);
}

export async function reorderStops(routeId, stopIds) {
  const route = await getRoute(routeId);
  if (!route) return null;

  const known = new Set(route.stops.map((s) => s.id));
  const clean = (stopIds || []).map(Number).filter((id) => known.has(id));
  if (clean.length !== route.stops.length) {
    const error = new Error('La lista de paradas no coincide con la ruta.');
    error.status = 400;
    throw error;
  }

  await withTransaction(async (connection) => {
    for (let i = 0; i < clean.length; i++) {
      await connection.execute(
        `UPDATE route_stops SET stop_order = :stopOrder WHERE id = :id AND route_id = :routeId`,
        { stopOrder: i + 1, id: clean[i], routeId }
      );
    }
  });

  return getRoute(routeId);
}

// Sacar una parada de una ruta borrador. El pedido vuelve al panel.
export async function removeStop(routeId, stopId) {
  const route = await getRoute(routeId);
  if (!route) return null;
  if (route.status !== 'borrador') {
    const error = new Error('Solo se pueden sacar paradas de rutas en borrador.');
    error.status = 400;
    throw error;
  }

  const target = route.stops.find((s) => s.id === stopId);
  if (!target) {
    const error = new Error('Esta parada no pertenece a esta ruta.');
    error.status = 404;
    throw error;
  }

  await withTransaction(async (connection) => {
    // Borrar el route_stop
    await connection.execute(
      'DELETE FROM route_stops WHERE id = :stopId AND route_id = :routeId',
      { stopId, routeId }
    );

    // Re-numerar el resto de las paradas para que queden 1, 2, 3...
    const [remaining] = await connection.execute(
      'SELECT id FROM route_stops WHERE route_id = :routeId ORDER BY stop_order',
      { routeId }
    );
    for (let i = 0; i < remaining.length; i++) {
      await connection.execute(
        'UPDATE route_stops SET stop_order = :order WHERE id = :id',
        { order: i + 1, id: remaining[i].id }
      );
    }
  });

  return getRoute(routeId);
}

export async function deleteRoute(routeId) {
  const route = await getRoute(routeId);
  if (!route) return false;
  if (route.status !== 'borrador') {
    const error = new Error('Solo se pueden eliminar rutas en borrador.');
    error.status = 400;
    throw error;
  }
  await pool.execute('DELETE FROM delivery_routes WHERE id = :id', { id: routeId });
  return true;
}

export async function updateStop(routeId, stopId, payload, currentUser) {
  const status = payload.status;
  const allowed = ['pendiente', 'en_camino', 'entregado', 'no_entregado', 'faltan_productos'];
  if (!allowed.includes(status)) {
    const error = new Error('Estado de parada invalido.');
    error.status = 400;
    throw error;
  }

  // Si es chofer, solo puede modificar paradas de su ruta tomada.
  if (currentUser?.role === 'chofer') {
    const [rows] = await pool.execute(
      `SELECT driver_id, status FROM delivery_routes WHERE id = :id`,
      { id: routeId }
    );
    const route = rows[0];
    if (!route) {
      const error = new Error('Ruta no encontrada.');
      error.status = 404;
      throw error;
    }
    if (route.driver_id !== currentUser.id) {
      const error = new Error('Esta ruta no esta asignada a vos. Tomala primero desde la lista.');
      error.status = 403;
      throw error;
    }
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
  // Orden simple y estable:
  // 1° Prioritarios.
  // 2° Pedidos con ventana horaria (más temprano primero).
  // 3° Resto por fecha de ingreso (más viejo primero).
  return [...orders].sort((a, b) => {
    if (Number(b.priority) !== Number(a.priority)) return Number(b.priority) - Number(a.priority);
    const timeDiff = timeValue(a) - timeValue(b);
    if (timeDiff !== 0) return timeDiff;
    const dateDiff = new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return Number(a.id) - Number(b.id);
  });
}

function timeValue(order) {
  if (!order.time_window_start) return Number.MAX_SAFE_INTEGER;
  const [hours, minutes] = String(order.time_window_start).split(':').map(Number);
  return hours * 60 + (minutes || 0);
}
